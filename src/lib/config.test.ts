import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CONFIG_FILENAME, ConfigService, getDefaults } from "@/lib/config";
import { JsonStore } from "@/lib/json-store";

import { isErr, isOk } from "@justmiracle/result";

let config: ConfigService;
let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "config-test-"));
  const store = new JsonStore({ dir: tmpDir, filename: CONFIG_FILENAME });
  config = new ConfigService(store);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("getDefaults", () => {
  test("returns the default config", () => {
    expect(getDefaults()).toEqual({
      model: "opencode:deepseek-v4-flash-free",
      showThinking: true,
      session: "global",
    });
  });

  test("returns a copy each call", () => {
    expect(getDefaults()).not.toBe(getDefaults());
  });
});

describe("configExists", () => {
  test("returns false when no config file", async () => {
    const result = await config.configExists();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(false);
    }
  });

  test("returns true after writing config", async () => {
    await config.writeConfig(getDefaults());
    const result = await config.configExists();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(true);
    }
  });
});

describe("readConfig", () => {
  test("returns ok(defaults) when no config file", async () => {
    const result = await config.readConfig();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual(getDefaults());
    }
  });

  test("returns ok(defaults) with default constructor and no file", async () => {
    const tmpDefaultDir = mkdtempSync(join(tmpdir(), "config-default-test-"));
    const origHome = process.env.HOME;
    process.env.HOME = tmpDefaultDir;

    const defaultConfig = new ConfigService();
    const result = await defaultConfig.readConfig();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual(getDefaults());
    }

    process.env.HOME = origHome;
    rmSync(tmpDefaultDir, { recursive: true, force: true });
  });

  test("returns ok(config) when valid file exists", async () => {
    await config.writeConfig({
      model: "anthropic:claude-sonnet-4-20250514",
      showThinking: false,
      session: "global",
    });

    const result = await config.readConfig();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({
        model: "anthropic:claude-sonnet-4-20250514",
        showThinking: false,
        session: "global",
      });
    }
  });

  test("returns err(parse) on invalid JSON", async () => {
    writeFileSync(join(tmpDir, CONFIG_FILENAME), "not-valid-json");

    const result = await config.readConfig();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("parse");
    }
  });

  test("returns err(invalid-schema) when fields are missing", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: CONFIG_FILENAME });
    await store.write({});

    const result = await config.readConfig();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("invalid-schema");
      expect(result.error.meta.issues).toBeDefined();
    }
  });

  test("returns err(invalid-schema) when fields have wrong types", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: CONFIG_FILENAME });
    await store.write({ model: 42, showThinking: true });

    const result = await config.readConfig();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("invalid-schema");
      expect(Array.isArray(result.error.meta.issues)).toBe(true);
    }
  });

  test("returns err(invalid-schema) when model lacks provider:pattern", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: CONFIG_FILENAME });
    await store.write({ model: "gpt-4o-mini", showThinking: true });

    const result = await config.readConfig();
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("invalid-schema");
      expect(result.error.meta.issues).toBeDefined();
    }
  });
});

describe("writeConfig", () => {
  test("writes and can be read back", async () => {
    const cfg = {
      model: "anthropic:claude-sonnet-4-20250514",
      showThinking: false,
      session: "global" as const,
    };

    const writeResult = await config.writeConfig(cfg);
    expect(isOk(writeResult)).toBe(true);

    const readResult = await config.readConfig();
    expect(isOk(readResult)).toBe(true);
    if (isOk(readResult)) {
      expect(readResult.value).toEqual(cfg);
    }
  });
});

describe("updateConfig", () => {
  test("merges partial into existing", async () => {
    await config.writeConfig({
      model: "anthropic:claude-sonnet-4-20250514",
      showThinking: false,
      session: "global",
    });

    const result = await config.updateConfig({ showThinking: true });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({
        model: "anthropic:claude-sonnet-4-20250514",
        showThinking: true,
        session: "global",
      });
    }

    const persisted = await config.readConfig();
    if (isOk(persisted)) {
      expect(persisted.value).toEqual({
        model: "anthropic:claude-sonnet-4-20250514",
        showThinking: true,
        session: "global",
      });
    }
  });

  test("starts from defaults when no existing config", async () => {
    const result = await config.updateConfig({ model: "anthropic:claude-sonnet-4-20250514" });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({
        model: "anthropic:claude-sonnet-4-20250514",
        showThinking: true,
        session: "global",
      });
    }
  });
});
