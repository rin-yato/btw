import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { JsonStore } from "@/lib/json-store";
import { SessionService } from "@/lib/session";

import { ok } from "@justmiracle/result";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "session-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function createService(): SessionService {
  return new SessionService((id) => new JsonStore({ dir: tmpDir, filename: `${id}.json` }));
}

describe("SessionService", () => {
  describe("getSessionId", () => {
    test("returns 'GLOBAL' sentinel in global mode", () => {
      const service = createService();
      expect(service.getSessionId("global")).toBe("GLOBAL");
    });

    test("returns BTW_SESSION_ID in per-terminal mode when env is set", () => {
      const prev = process.env.BTW_SESSION_ID;
      process.env.BTW_SESSION_ID = "test-session-123";

      const service = createService();
      expect(service.getSessionId("per-terminal")).toBe("test-session-123");

      process.env.BTW_SESSION_ID = prev;
    });

    test("returns undefined in per-terminal mode when env is not set", () => {
      const prev = process.env.BTW_SESSION_ID;
      delete process.env.BTW_SESSION_ID;

      const service = createService();
      expect(service.getSessionId("per-terminal")).toBeUndefined();

      process.env.BTW_SESSION_ID = prev;
    });
  });

  describe("loadMessages", () => {
    test("returns empty array when no session file exists", async () => {
      const service = createService();
      const result = await service.loadMessages("GLOBAL");
      expect(result).toEqual(ok([]));
    });

    test("returns empty array when session file has invalid JSON", async () => {
      writeFileSync(join(tmpDir, "GLOBAL.json"), "not valid json", "utf-8");
      const service = createService();
      const result = await service.loadMessages("GLOBAL");
      expect(result).toEqual(ok([]));
    });
  });

  describe("saveMessages and loadMessages", () => {
    const sampleMessages = [
      { role: "user", content: "hello", timestamp: 1000 },
      { role: "assistant", content: "hi there", timestamp: 2000 },
    ] as any;

    test("saves and loads messages", async () => {
      const service = createService();
      await service.saveMessages("GLOBAL", sampleMessages);

      const result = await service.loadMessages("GLOBAL");
      expect(result).toEqual(ok(sampleMessages));
    });

    test("accumulates messages across multiple saves", async () => {
      const service = createService();
      await service.saveMessages("GLOBAL", sampleMessages);

      const more = [
        { role: "user", content: "another question", timestamp: 3000 },
        { role: "assistant", content: "another answer", timestamp: 4000 },
      ] as any;
      await service.saveMessages("GLOBAL", more);

      const result = await service.loadMessages("GLOBAL");
      expect(result).toEqual(ok(more));
    });

    test("works with any session ID (per-terminal)", async () => {
      const service = createService();
      await service.saveMessages("custom-id", sampleMessages);

      const result = await service.loadMessages("custom-id");
      expect(result).toEqual(ok(sampleMessages));
    });
  });
});
