import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { StreamEvent } from "@/lib/ai";
import { AiService } from "@/lib/ai";
import { AUTH_FILENAME } from "@/lib/auth";
import { CONFIG_FILENAME } from "@/lib/config";
import { JsonStore } from "@/lib/json-store";

import { err, ok } from "@justmiracle/result";

// ---------------------------------------------------------------------------
// Mock external packages (shared across tests, replaced per-file)
// ---------------------------------------------------------------------------

mock.module("@earendil-works/pi-ai", () => ({
  getModel: (provider: string, model: string) => {
    if (provider === "openai" && model === "gpt-4o-mini")
      return { id: "gpt-4o-mini", provider: "openai", api: "openai-completions" };
    if (provider === "anthropic" && model === "claude-sonnet-4-20250514")
      return {
        id: "claude-sonnet-4-20250514",
        provider: "anthropic",
        api: "anthropic-completions",
      };
    if (provider === "opencode" && model === "big-pickle")
      return { id: "big-pickle", provider: "opencode", api: "openai-completions" };
    return undefined;
  },
  getModels: (provider: string) => {
    if (provider === "openai")
      return [{ id: "gpt-4o-mini", provider: "openai", api: "openai-completions" }];
    if (provider === "anthropic")
      return [
        { id: "claude-sonnet-4-20250514", provider: "anthropic", api: "anthropic-completions" },
      ];
    if (provider === "opencode")
      return [{ id: "big-pickle", provider: "opencode", api: "openai-completions" }];
    return [];
  },
  getProviders: () => ["openai", "anthropic", "opencode"],
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import { streamAnswer } from "@/cmd/question";

// ---------------------------------------------------------------------------
// Control variables
// ---------------------------------------------------------------------------

let _streamEvents: StreamEvent[];
let _modelConfigResult: any;
let _aborted: boolean;

class TestStreamError extends Error {
  readonly reason = "api-error" as const;
  readonly meta: Record<string, unknown> = {};
}

// ---------------------------------------------------------------------------
// Mock renderer
// ---------------------------------------------------------------------------

interface MockRenderer {
  writeText: ReturnType<typeof mock>;
  startThinking: ReturnType<typeof mock>;
  writeThinking: ReturnType<typeof mock>;
  endThinking: ReturnType<typeof mock>;
  end: ReturnType<typeof mock>;
}

function createRendererMock(): MockRenderer {
  return {
    writeText: mock(() => {}),
    startThinking: mock(() => {}),
    writeThinking: mock((_delta: string) => {}),
    endThinking: mock(() => {}),
    end: mock(() => {}),
  };
}

// ---------------------------------------------------------------------------
// AiService prototype overrides (saved/restored per test)
// ---------------------------------------------------------------------------

const _origStreamQuestion = AiService.prototype.streamQuestion;
const _origGetModelConfig = AiService.prototype.getModelConfig;

// ---------------------------------------------------------------------------
// Process spies
// ---------------------------------------------------------------------------

const exitSpy = spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit was called");
});

const stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true);

// ---------------------------------------------------------------------------
// Globals capture
// ---------------------------------------------------------------------------

const OrigAbortController = globalThis.AbortController;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const textAnswer: StreamEvent[] = [
  { type: "text", delta: "Hello! " },
  { type: "text", delta: "How can I help?" },
];

const thinkingAnswer: StreamEvent[] = [
  { type: "thinking_start" },
  { type: "thinking", delta: "Let me " },
  { type: "thinking", delta: "think..." },
  { type: "thinking_end" },
  { type: "text", delta: "The answer is **42**." },
];

// ---------------------------------------------------------------------------
// Per-test setup / teardown
// ---------------------------------------------------------------------------

let tmpDir: string;
let origConfigHome: string | undefined;
let origCacheHome: string | undefined;

beforeEach(async () => {
  // Configure AiService prototype
  AiService.prototype.getModelConfig = async () => _modelConfigResult;

  AiService.prototype.streamQuestion = async (
    _question: string,
    _config: unknown,
    onEvent: (e: StreamEvent) => void,
    _opts?: unknown,
  ) => {
    for (const event of _streamEvents) {
      onEvent(event);
    }
  };

  // Set up temp directories for config and auth
  tmpDir = mkdtempSync(join(tmpdir(), "btw-test-"));
  origConfigHome = process.env.XDG_CONFIG_HOME;
  origCacheHome = process.env.XDG_CACHE_HOME;
  process.env.XDG_CONFIG_HOME = join(tmpDir, "xconfig");
  process.env.XDG_CACHE_HOME = join(tmpDir, "xcache");

  mkdirSync(join(tmpDir, "xconfig", "btw"), { recursive: true });
  mkdirSync(join(tmpDir, "xcache", "btw"), { recursive: true });

  // Write config file
  const configStore = new JsonStore({
    dir: join(tmpDir, "xconfig", "btw"),
    filename: CONFIG_FILENAME,
  });
  await configStore.write({ model: "openai:gpt-4o-mini", showThinking: true });

  // Write auth file
  const authStore = new JsonStore({
    dir: join(tmpDir, "xcache", "btw"),
    filename: AUTH_FILENAME,
  });
  await authStore.write({ openai: "sk-test" });

  // Default control state
  _streamEvents = textAnswer;
  _modelConfigResult = ok({
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: "sk-test",
  });
  _aborted = false;

  // Override AbortController
  // @ts-expect-error - overriding global for testing
  globalThis.AbortController = class {
    signal = {
      aborted: _aborted,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    abort() {
      this.signal.aborted = true;
    }
  };
});

afterEach(() => {
  // Restore env
  if (origConfigHome) process.env.XDG_CONFIG_HOME = origConfigHome;
  else delete process.env.XDG_CONFIG_HOME;
  if (origCacheHome) process.env.XDG_CACHE_HOME = origCacheHome;
  else delete process.env.XDG_CACHE_HOME;

  // Cleanup temp dir
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // already cleaned up
  }

  // Restore AiService prototype
  AiService.prototype.streamQuestion = _origStreamQuestion;
  AiService.prototype.getModelConfig = _origGetModelConfig;

  // Restore AbortController
  globalThis.AbortController = OrigAbortController;

  // Clear spies
  exitSpy.mockClear();
  stderrSpy.mockClear();
});

// ---------------------------------------------------------------------------
// Helper: cast mock renderer for streamAnswer
// ---------------------------------------------------------------------------

function answer(renderer: MockRenderer, noThinking = false) {
  return streamAnswer("hello", noThinking, undefined, renderer as any);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("streamAnswer", () => {
  test("streams text events through renderer", async () => {
    _streamEvents = textAnswer;
    const renderer = createRendererMock();

    await answer(renderer);

    expect(renderer.writeText).toHaveBeenCalledTimes(2);
    expect(renderer.writeText).toHaveBeenNthCalledWith(1, "Hello! ");
    expect(renderer.writeText).toHaveBeenNthCalledWith(2, "How can I help?");
    expect(renderer.end).toHaveBeenCalledTimes(1);
  });

  test("streams thinking block followed by text", async () => {
    _streamEvents = thinkingAnswer;
    const renderer = createRendererMock();

    await answer(renderer);

    expect(renderer.startThinking).toHaveBeenCalledTimes(1);
    expect(renderer.writeThinking).toHaveBeenCalledTimes(2);
    expect(renderer.writeThinking).toHaveBeenNthCalledWith(1, "Let me ");
    expect(renderer.writeThinking).toHaveBeenNthCalledWith(2, "think...");
    expect(renderer.endThinking).toHaveBeenCalledTimes(1);
    expect(renderer.writeText).toHaveBeenCalledTimes(1);
    expect(renderer.writeText).toHaveBeenCalledWith("The answer is **42**.");
    expect(renderer.end).toHaveBeenCalledTimes(1);
  });

  test("hides thinking when noThinking is true", async () => {
    _streamEvents = thinkingAnswer;
    const renderer = createRendererMock();

    await answer(renderer, true);

    expect(renderer.startThinking).not.toHaveBeenCalled();
    expect(renderer.writeThinking).not.toHaveBeenCalled();
    expect(renderer.endThinking).not.toHaveBeenCalled();
    expect(renderer.writeText).toHaveBeenCalledTimes(1);
    expect(renderer.writeText).toHaveBeenCalledWith("The answer is **42**.");
    expect(renderer.end).toHaveBeenCalledTimes(1);
  });

  test("hides thinking when showThinking is false in config", async () => {
    const configStore = new JsonStore({
      dir: join(tmpDir, "xconfig", "btw"),
      filename: CONFIG_FILENAME,
    });
    await configStore.write({ model: "openai:gpt-4o-mini", showThinking: false });
    _streamEvents = thinkingAnswer;
    const renderer = createRendererMock();

    await answer(renderer);

    expect(renderer.startThinking).not.toHaveBeenCalled();
    expect(renderer.writeThinking).not.toHaveBeenCalled();
    expect(renderer.endThinking).not.toHaveBeenCalled();
    expect(renderer.writeText).toHaveBeenCalledTimes(1);
    expect(renderer.end).toHaveBeenCalledTimes(1);
  });

  test("exits on config read error (invalid schema)", async () => {
    const configStore = new JsonStore({
      dir: join(tmpDir, "xconfig", "btw"),
      filename: CONFIG_FILENAME,
    });
    await configStore.write({ showThinking: "not-a-boolean" } as any);
    const renderer = createRendererMock();

    await expect(answer(renderer)).rejects.toThrow("process.exit was called");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(renderer.end).not.toHaveBeenCalled();
  });

  test("exits on model config error", async () => {
    _modelConfigResult = err(new Error("No API key"));
    const renderer = createRendererMock();

    await expect(answer(renderer)).rejects.toThrow("process.exit was called");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(renderer.end).not.toHaveBeenCalled();
  });

  test("exits on stream error when not aborted", async () => {
    _streamEvents = [{ type: "error", error: new TestStreamError("API error") }];
    const renderer = createRendererMock();

    await expect(answer(renderer)).rejects.toThrow("process.exit was called");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrSpy).toHaveBeenCalled();
    expect(renderer.end).not.toHaveBeenCalled();
  });

  test("ends renderer on stream error when signal already aborted", async () => {
    _aborted = true;
    _streamEvents = [{ type: "error", error: new TestStreamError("API error") }];
    const renderer = createRendererMock();

    await answer(renderer);

    expect(exitSpy).not.toHaveBeenCalled();
    expect(stderrSpy).not.toHaveBeenCalled();
    expect(renderer.end).toHaveBeenCalled();
  });
});
