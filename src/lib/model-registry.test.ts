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
  test("falls through to pi-ai when no custom model matches", () => {
    const result = registry.getModel("openai", "gpt-4o-mini");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.id).toBe("gpt-4o-mini");
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
  test("returns pi-ai models for opencode when no custom models", () => {
    const models = registry.listModels("opencode");
    const ids = models.map((m) => m.id);
    expect(ids).toEqual(["big-pickle"]);
  });

  test("returns only pi-ai models for provider without custom models", () => {
    const models = registry.listModels("openai");
    expect(models).toHaveLength(1);
    expect(models[0]?.id).toBe("gpt-4o-mini");
  });

  test("returns empty array for unknown provider", () => {
    const models = registry.listModels("unknown-provider");
    expect(models).toEqual([]);
  });
});
