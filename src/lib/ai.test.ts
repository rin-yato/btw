import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { StreamEvent } from "@/lib/ai";
import { AiService } from "@/lib/ai";
import { AUTH_FILENAME, AuthService } from "@/lib/auth";
import { CONFIG_FILENAME, ConfigService, getDefaults } from "@/lib/config";
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
}));

let _promptReject: Error | null = null;

mock.module("@earendil-works/pi-agent-core", () => {
  class FakeAgent {
    private listeners: Array<(event: any) => void> = [];
    private _idleResolve!: () => void;
    private _idle: Promise<void>;

    constructor() {
      this._idle = new Promise((resolve) => {
        this._idleResolve = resolve;
      });
    }

    subscribe(listener: (event: any) => void) {
      this.listeners.push(listener);
      return () => {};
    }

    prompt() {
      if (_promptReject) {
        this._idleResolve();
        return Promise.reject(_promptReject);
      }

      const emit = (type: string, delta?: string) => {
        const ev: any = {
          type: "message_update",
          message: {},
          assistantMessageEvent: { type, contentIndex: 0, partial: {} },
        };
        if (delta !== undefined) ev.assistantMessageEvent.delta = delta;
        for (const listener of this.listeners) listener(ev);
      };

      emit("thinking_start");
      emit("thinking_delta", "Let me ");
      emit("thinking_delta", "think...");
      emit("thinking_end");
      emit("text_delta", "Hello!");

      this._idleResolve();
      return Promise.resolve();
    }

    waitForIdle() {
      return this._idle;
    }

    abort() {}
  }

  return { Agent: FakeAgent };
});

let ai: AiService;
let tmpDir: string;

beforeEach(() => {
  _promptReject = null;
  tmpDir = mkdtempSync(join(tmpdir(), "ai-test-"));
  const configStore = new JsonStore({ dir: tmpDir, filename: CONFIG_FILENAME });
  const authStore = new JsonStore({ dir: tmpDir, filename: AUTH_FILENAME });
  ai = new AiService(new ConfigService(configStore), new AuthService(authStore));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getModelConfig", () => {
  test("returns no-model error when no config file and no override", async () => {
    const result = await ai.getModelConfig();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("no-model");
    }
  });

  test("accepts an override even without a config file", async () => {
    const result = await ai.getModelConfig("openai:gpt-4o-mini");
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
  const config = { provider: "openai", model: "gpt-4o-mini", apiKey: "sk-key" };

  test("fires thinking and text events through callback", async () => {
    const events: StreamEvent[] = [];
    await ai.streamQuestion("Hello", config, (e) => events.push(e));

    expect(events).toEqual([
      { type: "thinking_start" },
      { type: "thinking", delta: "Let me " },
      { type: "thinking", delta: "think..." },
      { type: "thinking_end" },
      { type: "text", delta: "Hello!" },
    ]);
  });

  test("fires error event when prompt rejects", async () => {
    _promptReject = new Error("401 Unauthorized");

    const events: StreamEvent[] = [];
    await ai.streamQuestion("Hello", config, (e) => events.push(e));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error" });
  });

  test("does not fire error when signal is aborted", async () => {
    _promptReject = new Error("aborted");

    const controller = new AbortController();
    const events: StreamEvent[] = [];

    const promise = ai.streamQuestion("Hello", config, (e) => events.push(e), {
      signal: controller.signal,
    });
    controller.abort();
    await promise;

    expect(events).toHaveLength(0);
  });
});
