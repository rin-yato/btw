import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import {
  readConfig,
  writeConfig,
  updateConfig,
  getConfigDir,
  configExists,
  type ConfigSchema,
} from "@/config";

let tmpDir: string;
let oldXdg: string | undefined;

const SAMPLE: ConfigSchema = {
  provider: "anthropic",
  model: "claude-sonnet-4",
  showThinking: true,
};

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "btw-config-test-"));
  oldXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tmpDir;
});

afterEach(() => {
  if (oldXdg) process.env.XDG_CONFIG_HOME = oldXdg;
  else delete process.env.XDG_CONFIG_HOME;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getConfigDir", () => {
  test("uses XDG_CONFIG_HOME when set", () => {
    expect(getConfigDir()).toBe(join(tmpDir, "btw"));
  });

  test("falls back to ~/.config when XDG_CONFIG_HOME is unset", () => {
    delete process.env.XDG_CONFIG_HOME;
    const { homedir } = require("node:os");
    expect(getConfigDir()).toBe(join(homedir(), ".config", "btw"));
  });
});

describe("readConfig", () => {
  test("returns null when no config file exists", async () => {
    expect(await readConfig()).toBeNull();
  });

  test("reads a valid config file", async () => {
    await writeConfig(SAMPLE);
    const result = await readConfig();
    expect(result).toEqual(SAMPLE);
  });

  test("returns null on invalid JSON", async () => {
    const dir = getConfigDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "config.json"), "not-json");
    expect(await readConfig()).toBeNull();
  });
});

describe("writeConfig", () => {
  test("writes and can be read back", async () => {
    await writeConfig(SAMPLE);
    const content = await readConfig();
    expect(content).toEqual(SAMPLE);
  });

  test("creates parent directory", async () => {
    await writeConfig(SAMPLE);
    const { existsSync } = await import("node:fs");
    expect(existsSync(join(tmpDir, "btw", "config.json"))).toBeTrue();
  });
});

describe("updateConfig", () => {
  test("creates config with defaults then merges", async () => {
    const result = await updateConfig({ provider: "groq" });
    expect(result.provider).toBe("groq");
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.showThinking).toBe(true);
  });

  test("merges into existing config", async () => {
    await writeConfig(SAMPLE);
    const result = await updateConfig({ model: "claude-opus-4" });
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-opus-4");
    expect(result.showThinking).toBe(true);
  });
});

describe("configExists", () => {
  test("false when no config", async () => {
    expect(await configExists()).toBeFalse();
  });

  test("true after writing config", async () => {
    await writeConfig(SAMPLE);
    expect(await configExists()).toBeTrue();
  });
});
