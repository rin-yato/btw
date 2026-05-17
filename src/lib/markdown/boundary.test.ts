import { describe, expect, test } from "bun:test";

import { findStableBoundary } from "./boundary";

describe("findStableBoundary", () => {
  test("empty string", () => {
    expect(findStableBoundary("")).toBe(0);
  });

  test("single line no terminator", () => {
    expect(findStableBoundary("Hello")).toBe(0);
  });

  test("paragraph break commits", () => {
    expect(findStableBoundary("Hello\n\n")).toBe(7);
  });

  test("multiple paragraph breaks all commit", () => {
    const md = "Hello\n\nWorld\n\n";
    expect(findStableBoundary(md)).toBe(md.length);
  });

  test("text after paragraph break is not stable", () => {
    expect(findStableBoundary("Hello\n\nWorld")).toBe(7);
  });

  test("heading line is stable", () => {
    expect(findStableBoundary("# Hello\n")).toBe(8);
  });

  test("heading with trailing text commits heading only", () => {
    expect(findStableBoundary("# Hello\nWorld")).toBe(8);
  });

  test("horizontal rule line is stable", () => {
    expect(findStableBoundary("---\n")).toBe(4);
  });

  test("open fence is not stable", () => {
    expect(findStableBoundary("```\ncode\n")).toBe(0);
  });

  test("closed fence at end of input (no trailing newline)", () => {
    const md = "```\ncode\n```";
    expect(findStableBoundary(md)).toBe(md.length);
  });

  test("closed fence with trailing newline is stable", () => {
    const md = "```\ncode\n```\n";
    expect(findStableBoundary(md)).toBe(md.length);
  });

  test("stable content before open fence is stable", () => {
    expect(findStableBoundary("Hello\n\n```\ncode\n")).toBe(7);
  });

  test("inline code backticks do not trigger fence", () => {
    expect(findStableBoundary("use `console.log()`\n\n")).toBe(21);
  });

  test("tildes for fenced code", () => {
    const md = "~~~\ncode\n~~~\n";
    expect(findStableBoundary(md)).toBe(md.length);
  });

  test("open thinking block is not stable", () => {
    expect(findStableBoundary("<thinking>Let me reason")).toBe(0);
  });

  test("open thinking block with blank lines is not stable", () => {
    expect(findStableBoundary("<thinking>Reason 1\n\nReason 2\n\n")).toBe(0);
  });

  test("closed thinking block is stable", () => {
    expect(findStableBoundary("<thinking>Done</thinking>\n\n")).toBe(27);
  });

  test("thinking block then text: only paragraph break after closing is stable", () => {
    expect(findStableBoundary("<thinking>Done</thinking>\n\nMore")).toBe(27);
  });

  test("complete output with thinking and paragraph breaks", () => {
    const md = "<thinking>Reason 1\n\nReason 2</thinking>\n\nNext para\n\n";
    expect(findStableBoundary(md)).toBe(md.length);
  });

  test("thinking block followed by fence", () => {
    const md = "<thinking>Done</thinking>\n\n```\ncode\n```\n";
    expect(findStableBoundary(md)).toBe(md.length);
  });
});
