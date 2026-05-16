import { describe, expect, mock, test } from "bun:test";

import { ModelRegistry } from "@/lib/model-registry";

import { isErr, isOk } from "@justmiracle/result";

mock.module("@earendil-works/pi-ai", () => ({
  getModel: (_provider: string, _model: string) => {
    if (_provider === "openai" && _model === "gpt-4o-mini")
      return { id: "gpt-4o-mini", provider: "openai", api: "openai-completions" };
    if (_provider === "opencode" && _model === "big-pickle")
      return { id: "big-pickle", provider: "opencode", api: "openai-completions" };
    return undefined;
  },
  getModels: (_provider: string) => {
    if (_provider === "openai")
      return [{ id: "gpt-4o-mini", provider: "openai", api: "openai-completions" }];
    if (_provider === "opencode")
      return [{ id: "big-pickle", provider: "opencode", api: "openai-completions" }];
    return [];
  },
  getProviders: () => ["openai", "opencode"],
}));

const registry = new ModelRegistry();

describe("getModel", () => {
  test("returns custom model when it exists", () => {
    const result = registry.getModel("opencode", "deepseek-v4-flash-free");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe("deepseek-v4-flash-free");
      expect(result.value.provider).toBe("opencode");
    }
  });

  test("falls through to pi-ai when no custom model matches", () => {
    const result = registry.getModel("openai", "gpt-4o-mini");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe("gpt-4o-mini");
    }
  });

  test("custom model takes precedence over pi-ai when ids collide", () => {
    const result = registry.getModel("opencode", "deepseek-v4-flash-free");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe("deepseek-v4-flash-free");
      expect(result.value.provider).toBe("opencode");
    }
  });

  test("returns err for unknown model", () => {
    const result = registry.getModel("openai", "nonexistent-model");
    expect(isErr(result)).toBe(true);
  });

  test("returns err for unknown provider", () => {
    const result = registry.getModel("unknown-provider", "some-model");
    expect(isErr(result)).toBe(true);
  });
});

describe("listModels", () => {
  test("merges custom models with pi-ai models for opencode", () => {
    const models = registry.listModels("opencode");
    const ids = models.map((m) => m.id);
    expect(ids).toContain("big-pickle");
    expect(ids).toContain("deepseek-v4-flash-free");
  });

  test("returns only pi-ai models for provider without custom models", () => {
    const models = registry.listModels("openai");
    expect(models).toHaveLength(1);
    expect(models[0]?.id).toBe("gpt-4o-mini");
  });

  test("deduplicates when custom model id matches a pi-ai model", () => {
    const models = registry.listModels("opencode");
    const ids = models.map((m) => m.id);
    const deduped = new Set(ids);
    expect(ids.length).toBe(deduped.size);
  });

  test("returns empty array for unknown provider", () => {
    const models = registry.listModels("unknown-provider");
    expect(models).toEqual([]);
  });
});
