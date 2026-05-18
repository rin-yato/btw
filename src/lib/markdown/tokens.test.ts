import { describe, expect, test } from "bun:test";

import { marked } from "./marked";
import { TokenRenderer } from "./tokens";

function stripAnsi(s: string): string {
  const esc = String.fromCharCode(27);
  return s.replace(new RegExp(`${esc}\\[[\\d;]*m`, "g"), "");
}

describe("TokenRenderer", () => {
  const r = new TokenRenderer({ proseWidth: 80 });

  test("empty input", () => {
    expect(r.render(marked.lexer(""))).toBe("");
  });

  test("plain text", () => {
    const result = r.render(marked.lexer("hello world"));
    expect(result).toContain("hello world");
  });

  test("bold text", () => {
    const result = r.render(marked.lexer("**bold**"));
    expect(stripAnsi(result)).toContain("bold");
    expect(result).not.toContain("**"); // no raw syntax leak
  });

  test("italic text", () => {
    const result = r.render(marked.lexer("*italic*"));
    expect(stripAnsi(result)).toContain("italic");
    expect(result).not.toContain("*italic*");
  });

  test("inline code", () => {
    const result = r.render(marked.lexer("use `foo()`"));
    expect(stripAnsi(result)).toContain("foo()");
    expect(result).not.toContain("`foo()`");
  });

  test("heading", () => {
    const result = r.render(marked.lexer("# Heading"));
    expect(stripAnsi(result)).toContain("# Heading");
  });

  test("code block", () => {
    const result = r.render(marked.lexer("```\nconst x = 1;\n```"));
    expect(stripAnsi(result)).toContain("const x = 1;");
  });

  test("link", () => {
    const result = r.render(marked.lexer("[example](https://example.com)"));
    expect(stripAnsi(result)).toContain("example");
    expect(result).not.toContain("[example]");
  });

  test("blockquote", () => {
    const result = r.render(marked.lexer("> quoted text"));
    expect(stripAnsi(result)).toContain("quoted text");
  });

  test("horizontal rule", () => {
    const result = r.render(marked.lexer("---\n\nText"));
    expect(stripAnsi(result)).toContain("---");
  });

  test("list", () => {
    const result = r.render(marked.lexer("- item 1\n- item 2"));
    expect(stripAnsi(result)).toContain("item 1");
    expect(stripAnsi(result)).toContain("item 2");
  });

  test("strikethrough", () => {
    const result = r.render(marked.lexer("~~deleted~~"));
    expect(stripAnsi(result)).toContain("deleted");
  });
});
