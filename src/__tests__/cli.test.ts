import { describe, expect, test } from "bun:test";
import { parseArgs } from "../cli.ts";

describe("parseArgs", () => {
  test("parses question mode", () => {
    const result = parseArgs(["node", "btw", "what is 2+2"]);
    expect(result.mode).toBe("question");
    expect(result.question).toBe("what is 2+2");
  });

  test("parses question with multiple words", () => {
    const result = parseArgs(["node", "btw", "what", "is", "the", "capital", "of", "France"]);
    expect(result.mode).toBe("question");
    expect(result.question).toBe("what is the capital of France");
  });

  test("parses --help", () => {
    const result = parseArgs(["node", "btw", "--help"]);
    expect(result.mode).toBe("help");
  });

  test("parses -h", () => {
    const result = parseArgs(["node", "btw", "-h"]);
    expect(result.mode).toBe("help");
  });

  test("parses --version", () => {
    const result = parseArgs(["node", "btw", "--version"]);
    expect(result.mode).toBe("version");
  });

  test("parses -v", () => {
    const result = parseArgs(["node", "btw", "-v"]);
    expect(result.mode).toBe("version");
  });

  test("parses no-args mode", () => {
    const result = parseArgs(["node", "btw"]);
    expect(result.mode).toBe("no-args");
  });

  test("parses --no-thinking with question", () => {
    const result = parseArgs(["node", "btw", "--no-thinking", "hello"]);
    expect(result.mode).toBe("question");
    expect(result.question).toBe("hello");
    expect(result.noThinking).toBe(true);
  });

  test("parses --no-thinking without question", () => {
    const result = parseArgs(["node", "btw", "--no-thinking"]);
    expect(result.mode).toBe("no-args");
    expect(result.noThinking).toBe(true);
  });

  test("noThinking defaults to false", () => {
    const result = parseArgs(["node", "btw", "hi"]);
    expect(result.noThinking).toBe(false);
  });
});
