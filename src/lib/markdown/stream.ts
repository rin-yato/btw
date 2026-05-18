import { map, pipe, split, sum } from "remeda";

import { findStableBoundary } from "./boundary";
import { marked } from "./marked";
import type { MarkdownTheme, RenderMarkdownOptions } from "./theme";
import { applyStyle, defaultMarkdownTheme } from "./theme";
import { TokenRenderer } from "./tokens";

const ESC = String.fromCharCode(27);
const RE_ANSI = new RegExp(`${ESC}\\[[\\d;]*m`, "g");
const RE_OSC = new RegExp(`${ESC}\\].*?${ESC}\\\\`, "g");

const DEFAULT_PROSE_WIDTH = 88;

function stripAnsi(s: string): string {
  return s.replace(RE_ANSI, "").replace(RE_OSC, "");
}

function countLines(text: string, columns: number): number {
  return pipe(
    text,
    split("\n"),
    map((line) => Math.max(1, Math.ceil(stripAnsi(line).length / columns))),
    sum(),
  );
}

export class MarkdownRenderer {
  readonly #stream: NodeJS.WriteStream;
  #renderer: TokenRenderer;
  #theme: MarkdownTheme;
  #proseWidth: number;
  #buffer = "";
  #previewLines = 0;
  #thinkingBuffer = "";

  constructor(
    opts: {
      stream?: NodeJS.WriteStream;
      tokenRenderer?: TokenRenderer;
    } & RenderMarkdownOptions = {},
  ) {
    this.#stream = opts.stream ?? process.stdout;

    const terminalWidth = this.#stream.columns ?? 80;
    const rawProseWidth = opts.proseWidth ?? DEFAULT_PROSE_WIDTH;
    const proseWidth = Math.max(10, Math.min(terminalWidth, rawProseWidth));

    this.#theme = opts.theme ?? defaultMarkdownTheme;
    this.#proseWidth = proseWidth;
    this.#renderer =
      opts.tokenRenderer ??
      new TokenRenderer({
        proseWidth,
        theme: this.#theme,
      });
  }

  // ── public api ──────────────────────────────────────────────────────

  write(delta: string): void {
    this.writeText(delta);
  }

  writeText(delta: string): void {
    if (!this.#stream.isTTY) {
      this.#stream.write(delta);
      return;
    }

    this.#buffer += delta;
    this.#rerender();
  }

  startThinking(): void {
    this.#thinkingBuffer = "";
  }

  writeThinking(delta: string): void {
    if (!this.#stream.isTTY) {
      this.#stream.write(delta);
      return;
    }

    this.#thinkingBuffer += delta;
    this.#rerenderThinking();
  }

  endThinking(): void {
    this.#flushThinking();
  }

  end(): void {
    this.#flushThinking();

    if (this.#stream.isTTY) {
      this.#clearPreview();
      if (this.#buffer.length > 0) {
        this.#commit(this.#buffer);
        this.#buffer = "";
      }
    }
    this.#stream.write("\n");
  }

  // ── private: text path ──────────────────────────────────────────────

  #rerender(): void {
    const boundary = findStableBoundary(this.#buffer);

    this.#clearPreview();

    if (boundary > 0) {
      const stable = this.#buffer.slice(0, boundary);
      this.#commit(stable);
      this.#buffer = this.#buffer.slice(boundary);
    }

    if (this.#buffer.length > 0) {
      this.#renderPreview(this.#buffer);
    }
  }

  #commit(text: string): void {
    const tokens = marked.lexer(text);
    const rendered = this.#renderer.render(tokens);
    if (rendered.length > 0) {
      this.#stream.write(rendered);
      this.#stream.write("\n\n");
    }
  }

  #renderPreview(text: string): void {
    const tokens = marked.lexer(text);
    const rendered = this.#renderer.render(tokens);
    if (rendered.length === 0) return;
    this.#stream.write(rendered);
    this.#previewLines = countLines(rendered, this.#stream.columns ?? 80);
  }

  #clearPreview(): void {
    if (this.#previewLines === 0) return;

    if (this.#previewLines > 1) {
      this.#stream.write(`\x1b[${this.#previewLines - 1}A`);
    }
    this.#stream.write("\r\x1b[J");
    this.#previewLines = 0;
  }

  // ── private: thinking path ──────────────────────────────────────────

  #rerenderThinking(): void {
    const boundary = findStableBoundary(this.#thinkingBuffer);

    this.#clearPreview();

    if (boundary > 0) {
      const stable = this.#thinkingBuffer.slice(0, boundary);
      this.#emitThinking(stable, "\n");
      this.#thinkingBuffer = this.#thinkingBuffer.slice(boundary);
    }

    if (this.#thinkingBuffer.length > 0) {
      const rendered = this.#renderThinkingMarkup(this.#thinkingBuffer);
      if (rendered.length > 0) {
        this.#stream.write(rendered);
        this.#previewLines = countLines(rendered, this.#stream.columns ?? 80);
      }
    }
  }

  #flushThinking(): void {
    if (this.#thinkingBuffer.length === 0) return;
    this.#clearPreview();
    this.#emitThinking(this.#thinkingBuffer, "\n\n");
    this.#thinkingBuffer = "";
  }

  #renderThinkingMarkup(text: string): string {
    const border = this.#theme.thinking.border;
    const borderWidth = stripAnsi(border.mark).length;

    const innerWidth = Math.max(1, this.#proseWidth - borderWidth);
    const inner = new TokenRenderer({ proseWidth: innerWidth, theme: this.#theme });

    const tokens = marked.lexer(text);

    const rendered = inner.render(tokens);
    if (!rendered) return "";

    const prefix = applyStyle(border.mark, border);

    return rendered
      .split("\n")
      .map((line) => prefix + applyStyle(line, this.#theme.thinking))
      .join("\n");
  }

  #emitThinking(text: string, trailing: string): void {
    const rendered = this.#renderThinkingMarkup(text);
    if (rendered.length > 0) {
      this.#stream.write(rendered + trailing);
    }
  }
}
