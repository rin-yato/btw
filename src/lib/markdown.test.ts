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

function waitForMicrotask(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
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
  test("renders bold text", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("**bold**");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("bold");
    expect(out).not.toContain("**bold**");
  });

  test("renders italic text", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("*italic*");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("italic");
    expect(out).not.toContain("*italic*");
  });

  test("renders mixed inline styles", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("**bold** and *italic*");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("bold");
    expect(out).toContain("italic");
    expect(out).not.toContain("**");
    expect(out).not.toContain("*italic*");
  });

  test("renders inline code", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Use the `foo()` function");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("foo()");
    expect(out).not.toContain("`foo()`");
  });

  test("renders code blocks", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("```\nconst x = 1;\n```");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("const x = 1;");
  });

  test("renders links as hyperlinks", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("[example](https://example.com)");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("example");
    expect(out).toContain("https://example.com");
  });

  test("renders headings as bold", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("# Hello");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("Hello");
    expect(out).not.toContain("# Hello");
  });

  test("batches multiple deltas in a single microtask", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Hello ");
    r.write("**bold** ");
    r.write("world");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("Hello ");
    expect(out).toContain("bold");
    expect(out).toContain(" world");
    expect(out).not.toContain("**bold**");
  });

  test("emits cursor control codes on update", async () => {
    const { stream, getOutput } = createMockStream(true);
    const r = new MarkdownRenderer({ stream: stream as any });

    r.write("Hello");
    await waitForMicrotask();

    r.write("Hello **world**");
    await waitForMicrotask();
    r.end();

    const out = getOutput();
    expect(out).toContain("\x1b[");
    expect(out).toContain("\x1b[J");
  });
});
