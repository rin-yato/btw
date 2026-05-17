import { map, pipe, split, sum } from "remeda";

import { marked } from "./marked";
import type { MarkdownTheme, RenderMarkdownOptions } from "./theme";
import { defaultMarkdownTheme } from "./theme";
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

function findStableBoundary(markdown: string): number {
  const linePattern = markdown.match(/.*(?:\n|$)/g) ?? [];
  let offset = 0;
  let stableEnd = 0;
  let inFence = false;
  let fenceChar: string | undefined;
  let inThinking = false;

  for (const line of linePattern) {
    if (line === "") break;
    offset += line.length;
    const trimmed = line.trim();
    const lineComplete = line.endsWith("\n");

    if (trimmed.startsWith("<thinking>")) {
      if (trimmed.includes("</thinking>")) {
        stableEnd = offset;
      } else {
        inThinking = true;
      }
      continue;
    }

    if (inThinking) {
      if (trimmed.includes("</thinking>")) {
        inThinking = false;
        stableEnd = offset;
      }
      continue;
    }

    const fence = trimmed.match(/^(`{3,}|~{3,})/);
    if (fence) {
      const marker = fence[1]?.[0];
      if (!inFence) {
        inFence = true;
        fenceChar = marker;
      } else if (marker === fenceChar) {
        inFence = false;
        stableEnd = offset;
      }
      continue;
    }

    if (inFence) continue;

    if (trimmed === "") {
      stableEnd = offset;
    } else if (lineComplete && /^#{1,6}\s+/.test(trimmed)) {
      stableEnd = offset;
    } else if (lineComplete && /^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      stableEnd = offset;
    }
  }

  return stableEnd;
}

export class MarkdownRenderer {
  readonly #stream: NodeJS.WriteStream;
  #renderer: TokenRenderer;
  #theme: MarkdownTheme;
  #proseWidth: number;
  #buffer = "";
  #previewLines = 0;

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

  write(delta: string): void {
    if (!this.#stream.isTTY) {
      this.#stream.write(delta);
      return;
    }

    this.#buffer += delta;
    this.#rerender();
  }

  end(): void {
    if (this.#stream.isTTY) {
      this.#clearPreview();
      if (this.#buffer.length > 0) {
        this.#commit(this.#buffer);
        this.#buffer = "";
      }
    }
    this.#stream.write("\n");
  }

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

  #clearPreview(): void {
    if (this.#previewLines === 0) return;

    if (this.#previewLines > 1) {
      this.#stream.write(`\x1b[${this.#previewLines - 1}A`);
    }
    this.#stream.write("\r\x1b[J");
    this.#previewLines = 0;
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
}
