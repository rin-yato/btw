import type { Model } from "@earendil-works/pi-ai";

export const CUSTOM_MODELS: Record<string, Record<string, Model<"openai-completions">>> = {
  opencode: {
    "deepseek-v4-flash-free": {
      id: "deepseek-v4-flash-free",
      name: "DeepSeek V4 Flash (Free)",
      api: "openai-completions",
      provider: "opencode",
      baseUrl: "https://opencode.ai/zen/v1",
      compat: {
        requiresReasoningContentOnAssistantMessages: true,
        thinkingFormat: "deepseek",
      },
      reasoning: true,
      thinkingLevelMap: {
        minimal: null,
        low: null,
        medium: null,
        high: "high",
        xhigh: "max",
      },
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 1_000_000,
      maxTokens: 384_000,
    },
  },
};
