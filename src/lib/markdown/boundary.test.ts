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

  test("incomplete whitespace line is not stable", () => {
    expect(findStableBoundary("Hello\n ")).toBe(0);
  });

  test("incomplete indented list prefix is not stable", () => {
    const md = "- Parent\n  ";

    expect(findStableBoundary(md)).toBe(0);
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
});
