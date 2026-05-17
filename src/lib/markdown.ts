import type { Token, Tokens } from "marked";
import { marked } from "marked";
import pc from "picocolors";

const ESC = String.fromCharCode(27);
const RE_ANSI = new RegExp(`${ESC}\\[[\\d;]*m`, "g");
const RE_OSC = new RegExp(`${ESC}\\].*?${ESC}\\\\`, "g");

const HYPERLINKS_SUPPORTED = !process.env.NO_TERM_HYPERLINKS;

function renderTokens(tokens: Token[] | undefined): string {
  if (!tokens) return "";
  let out = "";
  for (const token of tokens) {
    out += renderToken(token);
  }
  return out;
}

function renderToken(token: Token): string {
  switch (token.type) {
    case "text":
      return token.text;
    case "strong":
      return pc.bold(renderTokens(token.tokens));
    case "em":
      return pc.italic(renderTokens(token.tokens));
    case "codespan":
      return pc.bgCyan(pc.black(token.text));
    case "link":
      return renderLink(token as Tokens.Link);
    case "escape":
      return token.text;
    case "paragraph":
      return `${renderTokens(token.tokens)}\n\n`;
    case "code":
      return renderCodeBlock(token as Tokens.Code);
    case "heading":
      return `${pc.bold(renderTokens(token.tokens))}\n\n`;
    case "space":
      return token.raw;
    default:
      return token.raw;
  }
}

function renderCodeBlock(token: Tokens.Code): string {
  const fence = pc.dim("┌─");
  const lines = token.text
    .split("\n")
    .map((l: string) => pc.dim(`│ ${l}`))
    .join("\n");
  const end = pc.dim("└─");
  return `${fence}\n${lines}\n${end}\n\n`;
}

function renderLink(token: Tokens.Link): string {
  const text = renderTokens(token.tokens);
  if (HYPERLINKS_SUPPORTED) {
    return `\x1b]8;;${token.href}\x1b\\${text}\x1b]8;;\x1b\\`;
  }
  return pc.underline(text);
}

function countLines(text: string, columns: number): number {
  let lines = 0;
  for (const line of text.split("\n")) {
    const width = stripAnsi(line).length;
    lines += Math.max(1, Math.ceil(width / columns));
  }
  return lines;
}

function stripAnsi(s: string): string {
  return s.replace(RE_ANSI, "").replace(RE_OSC, "");
}

export class MarkdownRenderer {
  readonly #stream: NodeJS.WriteStream;
  #buffer = "";
  #lastRenderedLines = 0;
  #pending = false;

  constructor(opts?: { stream?: NodeJS.WriteStream }) {
    this.#stream = opts?.stream ?? process.stdout;
  }

  write(delta: string): void {
    if (!this.#stream.isTTY) {
      this.#stream.write(delta);
      return;
    }

    this.#buffer += delta;

    if (!this.#pending) {
      this.#pending = true;
      queueMicrotask(() => this.#flush());
    }
  }

  end(): void {
    if (this.#stream.isTTY) {
      this.#flush();
    }
    this.#stream.write("\n");
  }

  #flush(): void {
    this.#pending = false;

    if (this.#lastRenderedLines > 0) {
      this.#stream.write(`\x1b[${this.#lastRenderedLines}A\x1b[J`);
    }

    const tokens = marked.lexer(this.#buffer);
    const rendered = renderTokens(tokens);
    this.#stream.write(rendered);
    this.#lastRenderedLines = countLines(rendered, this.#stream.columns ?? 80);
  }
}
