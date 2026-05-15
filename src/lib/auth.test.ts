import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { AuthService } from "@/lib/auth";
import { JsonStore } from "@/lib/json-store";

import { isErr, isOk } from "@justmiracle/result";

let auth: AuthService;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "auth-test-"));
  const store = new JsonStore({ dir: tmpDir, filename: "auth.json" });
  auth = new AuthService(store);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getApiKey", () => {
  test("returns key from auth file", async () => {
    await auth.setApiKey("openai", "sk-file-value");

    const result = await auth.getApiKey("openai");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe("sk-file-value");
    }
  });

  test("returns ok(null) when no key found", async () => {
    const result = await auth.getApiKey("openai");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBeNull();
    }
  });
});

describe("setApiKey", () => {
  test("persists key and can be read back", async () => {
    await auth.setApiKey("anthropic", "sk-ant-value");

    const result = await auth.getApiKey("anthropic");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe("sk-ant-value");
    }
  });

  test("overwrites existing key for the same provider", async () => {
    await auth.setApiKey("openai", "sk-first");
    await auth.setApiKey("openai", "sk-second");

    const result = await auth.getApiKey("openai");
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe("sk-second");
    }
  });

  test("does not affect other providers", async () => {
    await auth.setApiKey("openai", "sk-openai-value");
    await auth.setApiKey("anthropic", "sk-anthropic-value");

    const [openaiResult, anthropicResult] = await Promise.all([
      auth.getApiKey("openai"),
      auth.getApiKey("anthropic"),
    ]);

    if (isOk(openaiResult)) expect(openaiResult.value).toBe("sk-openai-value");
    if (isOk(anthropicResult)) expect(anthropicResult.value).toBe("sk-anthropic-value");
  });

  test("returns err on write failure", async () => {
    const badStore = new JsonStore({ dir: "/dev/null/btw", filename: "auth.json" });
    const badAuth = new AuthService(badStore);

    const result = await badAuth.setApiKey("openai", "sk-value");
    expect(isErr(result)).toBe(true);
  });
});
