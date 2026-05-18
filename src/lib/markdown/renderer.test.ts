import { describe, expect, test } from "bun:test";

import { Writable } from "node:stream";

import { MarkdownRenderer, ThinkingRenderer } from "@/lib/markdown";

function createMockStream(isTTY: boolean, columns = 80) {
  let output = "";
  const stream = new Writable({
    write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error) => void) {
      output += chunk.toString();
      callback();
    },
  });
  (stream as any).isTTY = isTTY;
  (stream as any).columns = columns;
  return { stream, getOutput: () => output };
}

function stripAnsi(s: string): string {
  const esc = String.fromCharCode(27);
  return s
    .replace(new RegExp(`${esc}\\[[\\d;]*[A-Za-z]`, "g"), "")
    .replace(new RegExp(`${esc}\\].*?${esc}\\\\`, "g"), "");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("MarkdownRenderer (non-TTY)", () => {
  test("passes through raw text", () => {
    const { stream, getOutput } = createMockStream(false);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("hello world");
    r.end();

    expect(getOutput()).toBe("hello world\n");
  });

  test("passes through multiple deltas", () => {
    const { stream, getOutput } = createMockStream(false);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("hello ");
    r.write("world");
    r.end();

    expect(getOutput()).toBe("hello world\n");
  });

  test("passes through markdown syntax unchanged", () => {
    const { stream, getOutput } = createMockStream(false);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("**bold** and *italic* and `code`");
    r.end();

    expect(getOutput()).toBe("**bold** and *italic* and `code`\n");
  });
});

describe("MarkdownRenderer (TTY)", () => {
  test("renders ANSI preview on first write", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("**bold**");

    const out = getOutput();
    expect(out).toContain("bold");
    expect(out).not.toContain("**bold**");
  });

  test("appends preview updates when rendering only grows", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Hello");
    const afterFirst = getOutput();
    // Preview renders without trailing newlines; 'clear' only when replaced
    expect(afterFirst).toBe("Hello");

    r.write(" **world**");
    await delay(75);

    const afterSecond = getOutput();
    expect(afterSecond).not.toContain("\r\x1b[J");
    expect(afterSecond).not.toContain("**world**");
  });

  test("repaints preview when markdown changes previous output", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("**bo");
    r.write("ld**");
    await delay(75);

    const out = getOutput();
    expect(out).toContain("\r\x1b[J");
    expect(out).toContain("bold");
    expect(out).not.toContain("**bold**");
  });

  test("falls back when terminal reports zero columns", async () => {
    const { stream, getOutput } = createMockStream(true, 0);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Hello");
    r.write(" world");
    await delay(75);

    const out = getOutput();
    expect(out).not.toContain("Infinity");
    expect(out).toContain("Hello world");
  });

  test("commits stable content after paragraph break", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Hello\n\n");
    const out = getOutput();
    // Committed content — no escape codes
    expect(out).not.toContain("\x1b[");
    expect(out).not.toContain("\r\x1b[J");
    expect(out).toBe("Hello\n\n");
  });

  test("commits stable across multiple writes", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Hello ");
    r.write("**world**\n\n");

    const out = getOutput();
    // Should eventually be committed cleanly
    expect(out).not.toContain("**world**");
    expect(out).toContain("world");
  });

  test("renders bold in final output", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("**bold**");
    r.end();

    const out = getOutput();
    expect(out).toContain("bold");
    expect(out).not.toContain("**bold**");
  });

  test("renders italic in final output", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("*italic*");
    r.end();

    const out = getOutput();
    expect(out).toContain("italic");
    expect(out).not.toContain("*italic*");
  });

  test("renders inline code in final output", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Use the `foo()` function");
    r.end();

    const out = getOutput();
    expect(out).toContain("foo()");
    expect(out).not.toContain("`foo()`");
  });

  test("renders code blocks in final output", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("```\nconst x = 1;\n```");
    r.end();

    const out = getOutput();
    expect(out).toContain("const x = 1;");
  });

  test("renders links in final output", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("[example](https://example.com)");
    r.end();

    const out = getOutput();
    expect(out).toContain("example");
    expect(out).toContain("https://example.com");
  });

  test("renders headings in final output", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("# Hello");
    r.end();

    const out = getOutput();
    // Heading renders with '# ' prefix styled in cyan+bold
    expect(out).toContain("Hello");
  });

  test("preserves nested list indentation when streamed", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });
    const md = "- Parent\n  1. Child\n     - Grandchild\n\n";

    for (const char of md) {
      r.write(char);
    }
    r.end();

    const out = stripAnsi(getOutput());
    expect(out.endsWith("- Parent\n  1. Child\n     - Grandchild\n\n\n")).toBe(true);
  });

  test("preserves blank lines between streamed thinking blocks", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new ThinkingRenderer({ stream: stream as any });
    const md = "First paragraph\n\n## Heading\n\nSecond paragraph";

    r.start();
    for (const char of md) {
      r.write(char);
    }
    r.end();

    const out = stripAnsi(getOutput());
    expect(out).toContain("┃ First paragraph\n┃ \n┃ ## Heading\n┃ \n┃ Second paragraph");
  });

  test("renders complex markdown inside streamed thinking", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new ThinkingRenderer({ stream: stream as any });
    const md = [
      "- Check the example",
      "  - It contains markdown",
      "",
      "```md",
      "# Title",
      "",
      "- item",
      "```",
    ].join("\n");

    r.start();
    for (const char of md) {
      r.write(char);
    }
    r.end();

    const out = stripAnsi(getOutput());
    expect(out).toContain("┃ - Check the example\n┃   - It contains markdown");
    expect(out).toContain("┃ ```md\n┃ # Title\n┃ \n┃ - item\n┃ ```");
  });
});
