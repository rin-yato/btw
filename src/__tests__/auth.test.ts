import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { getApiKey, setApiKey } from "@/auth";

let tmpDir: string;
let oldXdg: string | undefined;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "btw-auth-test-"));
  oldXdg = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = tmpDir;
});

afterEach(() => {
  if (oldXdg) process.env.XDG_CACHE_HOME = oldXdg;
  else delete process.env.XDG_CACHE_HOME;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getApiKey", () => {
  test("returns null when no auth file exists", async () => {
    expect(await getApiKey("openai")).toBeNull();
  });

  test("returns the stored API key for a provider", async () => {
    await setApiKey("openai", "sk-openai-key");
    expect(await getApiKey("openai")).toBe("sk-openai-key");
  });

  test("returns null for a different provider", async () => {
    await setApiKey("openai", "sk-openai-key");
    expect(await getApiKey("anthropic")).toBeNull();
  });

  test("returns null on invalid JSON", async () => {
    const dir = join(tmpDir, "btw");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "auth.json"), "not-json");
    expect(await getApiKey("openai")).toBeNull();
  });
});

describe("setApiKey", () => {
  test("writes and can be read back", async () => {
    await setApiKey("groq", "sk-groq-key");
    expect(await getApiKey("groq")).toBe("sk-groq-key");
  });

  test("stores multiple provider keys independently", async () => {
    await setApiKey("openai", "sk-oa");
    await setApiKey("anthropic", "sk-ant");
    expect(await getApiKey("openai")).toBe("sk-oa");
    expect(await getApiKey("anthropic")).toBe("sk-ant");
  });

  test("overwrites existing key for same provider", async () => {
    await setApiKey("openai", "sk-first");
    await setApiKey("openai", "sk-second");
    expect(await getApiKey("openai")).toBe("sk-second");
  });

  test("creates parent directory", async () => {
    await setApiKey("xai", "sk-xai-key");
    const { existsSync } = await import("node:fs");
    expect(existsSync(join(tmpDir, "btw", "auth.json"))).toBeTrue();
  });
});
