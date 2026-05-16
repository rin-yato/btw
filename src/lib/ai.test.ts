import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AiService } from "@/lib/ai";
import { AuthService } from "@/lib/auth";
import { ConfigService, getDefaults } from "@/lib/config";
import { JsonStore } from "@/lib/json-store";
import { mergeObjects } from "@/lib/utils";

import { isErr, isOk } from "@justmiracle/result";

mock.module("@earendil-works/pi-ai", () => ({
  getModel: (provider: string, model: string) => {
    if (provider === "openai" && model === "gpt-4o-mini") return { id: model, provider };
    if (provider === "anthropic" && model === "claude-sonnet-4-20250514")
      return { id: model, provider };
    return undefined;
  },
  stream: () => {
    let done = false;
    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          if (done) return { done: true as const, value: undefined };
          done = true;
          return {
            done: false as const,
            value: { type: "text_delta", delta: "Hello!", contentIndex: 0, partial: {} },
          };
        },
      }),
    };
  },
}));

let ai: AiService;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "ai-test-"));
  const configStore = new JsonStore({ dir: tmpDir, filename: "config.json" });
  const authStore = new JsonStore({ dir: tmpDir, filename: "auth.json" });
  ai = new AiService(new ConfigService(configStore), new AuthService(authStore));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getModelConfig", () => {
  test("resolves model from config defaults when no config file", async () => {
    const result = await ai.getModelConfig();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("authentication");
    }
  });

  test("reads provider and model from config", async () => {
    await ai.config.writeConfig(
      mergeObjects(getDefaults(), {
        model: "anthropic:claude-sonnet-4-20250514",
        showThinking: true,
      }),
    );
    await ai.auth.setApiKey("anthropic", "sk-ant-key");

    const result = await ai.getModelConfig();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-ant-key",
      });
    }
  });

  test("applies modelOverride", async () => {
    await ai.auth.setApiKey("anthropic", "sk-ant-key");

    const result = await ai.getModelConfig("anthropic:claude-sonnet-4-20250514");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        apiKey: "sk-ant-key",
      });
    }
  });

  test("returns AiError when no API key found", async () => {
    const result = await ai.getModelConfig("openai:gpt-4o-mini");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("authentication");
    }
  });

  test("returns AiError when model not found", async () => {
    await ai.auth.setApiKey("openai", "sk-key");

    const result = await ai.getModelConfig("openai:nonexistent");
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("model-not-found");
    }
  });
});

describe("streamQuestion", () => {
  test("yields text events from pi-ai stream", async () => {
    const config = { provider: "openai", model: "gpt-4o-mini", apiKey: "sk-key" };
    const events: any[] = [];

    for await (const event of ai.streamQuestion("Hello", config)) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "text", delta: "Hello!" });
  });
});
