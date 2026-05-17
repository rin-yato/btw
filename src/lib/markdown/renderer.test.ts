import { describe, expect, test } from "bun:test";

import { Writable } from "node:stream";

import { MarkdownRenderer } from "@/lib/markdown";

function createMockStream(isTTY: boolean) {
  let output = "";
  const stream = new Writable({
    write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error) => void) {
      output += chunk.toString();
      callback();
    },
  });
  (stream as any).isTTY = isTTY;
  (stream as any).columns = 80;
  return { stream, getOutput: () => output };
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

  test("re-renders preview on subsequent write (no boundary)", () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Hello");
    const afterFirst = getOutput();
    // Preview renders without trailing newlines; 'clear' only when replaced
    expect(afterFirst).toBe("Hello");

    r.write(" **world**");
    const afterSecond = getOutput();
    expect(afterSecond).toContain("\r\x1b[J");
    expect(afterSecond).not.toContain("**world**");
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
});
