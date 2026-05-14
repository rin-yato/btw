import { describe, expect, test } from "bun:test";
import {
  registerFauxProvider,
  fauxAssistantMessage,
  fauxText,
  fauxThinking,
} from "@earendil-works/pi-ai";
import { streamQuestion, getModelConfig } from "@/ai";

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
    const reg = registerFauxProvider({ tokensPerSecond: 100 });
    const model = reg.getModel();

    reg.setResponses([
      fauxAssistantMessage([
        fauxText("This is a long response that should be cancelled"),
      ]),
    ]);

    const controller = new AbortController();
    const textParts: string[] = [];

    setTimeout(() => controller.abort(), 50);

    const stream = streamQuestion(
      "Hi",
      { provider: "", model: "", apiKey: "test" },
      { model, signal: controller.signal },
    );

    try {
      for await (const event of stream) {
        if (event.type === "text") textParts.push(event.delta);
      }
    } catch {}

    expect(textParts.length).toBeGreaterThan(0);
    expect(controller.signal.aborted).toBe(true);
    reg.unregister();
  });
});

describe("getModelConfig", () => {
  test("returns defaults when env vars are not set", () => {
    const config = getModelConfig();
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.apiKey).toBe("");
  });
});
