import { describe, expect, test } from "bun:test";

import { ModelStringSchema, parseModelString, toModelString } from "@/lib/model";

import { isErr, isOk } from "@justmiracle/result";
import * as v from "valibot";

describe("toModelString", () => {
  test("joins provider and model with colon", () => {
    expect(toModelString("openai", "gpt-4o-mini")).toBe("openai:gpt-4o-mini");
    expect(toModelString("anthropic", "claude-sonnet-4-20250514")).toBe(
      "anthropic:claude-sonnet-4-20250514",
    );
  });
});

describe("parseModelString", () => {
  test("splits on the first colon", () => {
    const result = parseModelString("openai:gpt-4o-mini");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ provider: "openai", model: "gpt-4o-mini" });
    }
  });

  test("handles model names with extra colons", () => {
    const result = parseModelString("openai:gpt-4o-mini:latest");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ provider: "openai", model: "gpt-4o-mini:latest" });
    }
  });

  test("returns err when no colon", () => {
    const result = parseModelString("justamodel");
    expect(isErr(result)).toBe(true);
  });

  test("returns err for empty string", () => {
    const result = parseModelString("");
    expect(isErr(result)).toBe(true);
  });
});

describe("ModelStringSchema", () => {
  test("validates provider:model format", () => {
    const result = v.safeParse(ModelStringSchema, "openai:gpt-4o-mini");
    expect(result.success).toBe(true);
  });

  test("rejects string without colon", () => {
    const result = v.safeParse(ModelStringSchema, "gpt-4o-mini");
    expect(result.success).toBe(false);
  });

  test("rejects empty before colon", () => {
    const result = v.safeParse(ModelStringSchema, ":gpt-4o-mini");
    expect(result.success).toBe(false);
  });

  test("rejects empty after colon", () => {
    const result = v.safeParse(ModelStringSchema, "openai:");
    expect(result.success).toBe(false);
  });

  test("rejects non-string input", () => {
    const result = v.safeParse(ModelStringSchema, 42);
    expect(result.success).toBe(false);
  });
});
