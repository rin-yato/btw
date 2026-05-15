import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonStore } from "@/lib/json-store";

import { isErr, isOk } from "@justmiracle/result";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "json-store-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("JsonStore.read", () => {
  test("returns ok with parsed data when file exists", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: "data.json" });
    await store.write({ hello: "world" });

    const result = await store.read();

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ hello: "world" });
    }
  });

  test("returns err(not-found) when file does not exist", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: "missing.json" });

    const result = await store.read();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("not-found");
    }
  });

  test("returns err(parse) on invalid JSON", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: "bad.json" });
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "bad.json"), "not-json");

    const result = await store.read();

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.reason).toBe("parse");
    }
  });
});

describe("JsonStore.write", () => {
  test("writes data and can be read back", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: "test.json" });

    const writeResult = await store.write({ foo: [1, 2, 3] });
    expect(isOk(writeResult)).toBe(true);

    const readResult = await store.read();
    expect(isOk(readResult)).toBe(true);
    if (isOk(readResult)) {
      expect(readResult.value).toEqual({ foo: [1, 2, 3] });
    }
  });

  test("creates parent directory", async () => {
    const nestedDir = join(tmpDir, "a", "b");
    const store = new JsonStore({ dir: nestedDir, filename: "nested.json" });

    const result = await store.write({ ok: true });
    expect(isOk(result)).toBe(true);

    expect(store.exists()).toBe(true);
  });

  test("returns err when write fails", async () => {
    const store = new JsonStore({ dir: "/dev/null/btw", filename: "x.json" });

    const result = await store.write({ data: 1 });

    expect(isErr(result)).toBe(true);
  });
});

describe("JsonStore.exists", () => {
  test("returns false when file does not exist", () => {
    const store = new JsonStore({ dir: tmpDir, filename: "nope.json" });
    expect(store.exists()).toBe(false);
  });

  test("returns true after writing", async () => {
    const store = new JsonStore({ dir: tmpDir, filename: "exists.json" });
    await store.write({});
    expect(store.exists()).toBe(true);
  });
});
