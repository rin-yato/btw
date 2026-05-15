import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  registerFauxProvider,
  fauxAssistantMessage,
  fauxText,
  fauxThinking,
} from "@earendil-works/pi-ai";
import { streamQuestion, getModelConfig } from "@/ai";

let tmpDir: string;
let oldXdgConfig: string | undefined;
let oldXdgCache: string | undefined;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "btw-ai-test-"));
  oldXdgConfig = process.env.XDG_CONFIG_HOME;
  oldXdgCache = process.env.XDG_CACHE_HOME;
  process.env.XDG_CONFIG_HOME = join(tmpDir, "config");
  process.env.XDG_CACHE_HOME = join(tmpDir, "cache");
});

afterEach(() => {
  if (oldXdgConfig) process.env.XDG_CONFIG_HOME = oldXdgConfig;
  else delete process.env.XDG_CONFIG_HOME;
  if (oldXdgCache) process.env.XDG_CACHE_HOME = oldXdgCache;
  else delete process.env.XDG_CACHE_HOME;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("streamQuestion", () => {
  test("streams text deltas", async () => {
    const reg = registerFauxProvider({ tokensPerSecond: 0 });
    const model = reg.getModel();

    reg.setResponses([fauxAssistantMessage([fauxText("Hello world")])]);

    const parts: string[] = [];

    for await (const event of streamQuestion(
      "Hi",
      { provider: "", model: "", apiKey: "test" },
      { model },
    )) {
      if (event.type === "text") parts.push(event.delta);
    }

    expect(parts.join("")).toBe("Hello world");
    reg.unregister();
  });

  test("streams thinking content", async () => {
    const reg = registerFauxProvider({ tokensPerSecond: 0 });
    const model = reg.getModel();

    reg.setResponses([
      fauxAssistantMessage([
        fauxThinking("Let me think about this..."),
        fauxText("The answer is 42."),
      ]),
    ]);

    const thinkingParts: string[] = [];
    const textParts: string[] = [];

    for await (const event of streamQuestion(
      "What is the meaning of life?",
      { provider: "", model: "", apiKey: "test" },
      { model },
    )) {
      if (event.type === "thinking") thinkingParts.push(event.delta);
      if (event.type === "text") textParts.push(event.delta);
    }

    expect(thinkingParts.join("")).toBe("Let me think about this...");
    expect(textParts.join("")).toBe("The answer is 42.");
    reg.unregister();
  });

  test("streams thinking-only response", async () => {
    const reg = registerFauxProvider({ tokensPerSecond: 0 });
    const model = reg.getModel();

    reg.setResponses([
      fauxAssistantMessage([fauxThinking("I am thinking...")]),
    ]);

    const parts: string[] = [];

    for await (const event of streamQuestion(
      "Think!",
      { provider: "", model: "", apiKey: "test" },
      { model },
    )) {
      if (event.type === "thinking") parts.push(event.delta);
    }

    expect(parts.join("")).toBe("I am thinking...");
    reg.unregister();
  });

  test("handles cancellation", async () => {
    const reg = registerFauxProvider({ tokensPerSecond: 50 });
    const model = reg.getModel();

    reg.setResponses([
      fauxAssistantMessage([
        fauxText("aaa bbb ccc ddd eee fff ggg hhh iii jjj"),
      ]),
    ]);

    const controller = new AbortController();
    const textParts: string[] = [];

    setTimeout(() => controller.abort(), 300);

    try {
      for await (const event of streamQuestion(
        "Hi",
        { provider: "", model: "", apiKey: "test" },
        { model, signal: controller.signal },
      )) {
        if (event.type === "text") textParts.push(event.delta);
      }
    } catch {}

    expect(textParts.length).toBeGreaterThan(0);
    reg.unregister();
  });
});

describe("getModelConfig", () => {
  test("returns defaults when env vars and config are not set", async () => {
    const config = await getModelConfig();
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.apiKey).toBe("");
  });

  test("modelOverride wins over defaults", async () => {
    const config = await getModelConfig("anthropic/claude-sonnet-4");
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe("claude-sonnet-4");
  });

  test("reads apiKey from auth store", async () => {
    const { setApiKey } = await import("@/auth");
    await setApiKey("openai", "sk-auth-key");
    const config = await getModelConfig();
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.apiKey).toBe("sk-auth-key");
  });
});
