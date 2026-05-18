import { map, pipe, split, sum } from "remeda";

import { findStableBoundary } from "./boundary";
import { marked } from "./marked";
import type { MarkStyle, RenderMarkdownOptions, TextStyle } from "./theme";
import { applyStyle, defaultMarkdownTheme } from "./theme";
import { TokenRenderer } from "./tokens";

const ESC = String.fromCharCode(27);
const RE_ANSI = new RegExp(`${ESC}\\[[\\d;]*m`, "g");
const RE_OSC = new RegExp(`${ESC}\\].*?${ESC}\\\\`, "g");

const DEFAULT_PROSE_WIDTH = 88;
const DEFAULT_TERMINAL_WIDTH = 80;
const PREVIEW_FRAME_MS = 50;

function stripAnsi(s: string): string {
  return s.replace(RE_ANSI, "").replace(RE_OSC, "");
}

function terminalColumns(columns: number | undefined): number {
  return Number.isFinite(columns) && typeof columns === "number" && columns > 0
    ? columns
    : DEFAULT_TERMINAL_WIDTH;
}

function countLines(text: string, columns: number | undefined): number {
  const width = terminalColumns(columns);

  return pipe(
    text,
    split("\n"),
    map((line) => Math.max(1, Math.ceil(stripAnsi(line).length / width))),
    sum(),
  );
}

export class MarkdownRenderer {
  readonly #stream: NodeJS.WriteStream;
  #renderer: TokenRenderer;
  #linePrefix: MarkStyle | undefined;
  #lineStyle: TextStyle | undefined;
  #buffer = "";
  #pendingPreview = false;
  #preview = "";
  #previewLines = 0;
  #previewTimer: ReturnType<typeof setTimeout> | undefined;
  #lastPreviewAt = 0;

  constructor(
    opts: {
      stream?: NodeJS.WriteStream;
      tokenRenderer?: TokenRenderer;
    } & RenderMarkdownOptions = {},
  ) {
    this.#stream = opts.stream ?? process.stdout;

    const terminalWidth = terminalColumns(this.#stream.columns);
    const rawProseWidth = opts.proseWidth ?? DEFAULT_PROSE_WIDTH;
    const proseWidth = Math.max(10, Math.min(terminalWidth, rawProseWidth));

    const theme = opts.theme ?? defaultMarkdownTheme;
    const prefixWidth = opts.linePrefix ? stripAnsi(opts.linePrefix.mark).length : 0;
    const renderWidth = Math.max(1, proseWidth - prefixWidth);

    this.#linePrefix = opts.linePrefix;
    this.#lineStyle = opts.lineStyle;
    this.#renderer =
      opts.tokenRenderer ??
      new TokenRenderer({
        proseWidth: renderWidth,
        theme,
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
    this.#schedulePreview();
  }

  end(): void {
    this.#cancelScheduledPreview();

    if (this.#stream.isTTY) {
      this.#clearPreview();
      if (this.#buffer.length > 0) {
        this.#commit(this.#buffer);
        this.#buffer = "";
      }
    }
    this.#stream.write("\n\n");
  }

  // ── private: text path ──────────────────────────────────────────────

  #schedulePreview(): void {
    this.#pendingPreview = true;

    if (findStableBoundary(this.#buffer) > 0) {
      this.#flushScheduledPreview();
      return;
    }

    if (this.#previewTimer) return;

    const elapsed = Date.now() - this.#lastPreviewAt;
    const delay = Math.max(0, PREVIEW_FRAME_MS - elapsed);

    if (delay === 0) {
      this.#flushScheduledPreview();
      return;
    }

    this.#previewTimer = setTimeout(() => {
      this.#flushScheduledPreview();
    }, delay);
  }

  #flushScheduledPreview(): void {
    if (this.#previewTimer) {
      clearTimeout(this.#previewTimer);
      this.#previewTimer = undefined;
    }

    const pendingPreview = this.#pendingPreview;
    this.#pendingPreview = false;

    if (pendingPreview) {
      this.#rerender();
    }

    this.#lastPreviewAt = Date.now();
  }

  #cancelScheduledPreview(): void {
    if (this.#previewTimer) {
      clearTimeout(this.#previewTimer);
      this.#previewTimer = undefined;
    }
    this.#pendingPreview = false;
  }

  #rerender(): void {
    const boundary = findStableBoundary(this.#buffer);

    if (boundary > 0) {
      this.#clearPreview();
      const stable = this.#buffer.slice(0, boundary);
      this.#commit(stable);
      this.#buffer = this.#buffer.slice(boundary);
    }

    if (this.#buffer.length > 0) {
      this.#renderPreview(this.#buffer);
    }
  }

  #commit(text: string): void {
    const rendered = this.#renderMarkdown(text);
    if (rendered.length > 0) {
      this.#stream.write(rendered);
      this.#stream.write(this.#linePrefix ? `\n${this.#styledLinePrefix()}\n` : "\n\n");
    }
  }

  #renderPreview(text: string): void {
    const rendered = this.#renderMarkdown(text);
    this.#paintPreview(rendered);
  }

  #renderMarkdown(text: string): string {
    const tokens = marked.lexer(text);
    const rendered = this.#renderer.render(tokens);
    return this.#decorate(rendered);
  }

  #decorate(rendered: string): string {
    if (!this.#linePrefix && !this.#lineStyle) return rendered;
    if (rendered.length === 0) return "";

    const prefix = this.#styledLinePrefix();
    return rendered
      .split("\n")
      .map((line) => prefix + (this.#lineStyle ? applyStyle(line, this.#lineStyle) : line))
      .join("\n");
  }

  #styledLinePrefix(): string {
    if (!this.#linePrefix) return "";
    return applyStyle(this.#linePrefix.mark, this.#linePrefix);
  }

  #paintPreview(rendered: string): void {
    if (rendered.length === 0) {
      this.#clearPreview();
      return;
    }

    if (rendered === this.#preview) return;

    if (this.#preview.length > 0 && rendered.startsWith(this.#preview)) {
      this.#stream.write(rendered.slice(this.#preview.length));
    } else {
      this.#clearPreview();
      this.#stream.write(rendered);
    }

    this.#preview = rendered;
    this.#previewLines = countLines(rendered, this.#stream.columns);
  }

  #clearPreview(): void {
    if (this.#previewLines === 0) {
      this.#preview = "";
      return;
    }

    if (this.#previewLines > 1) {
      this.#stream.write(`\x1b[${this.#previewLines - 1}A`);
    }
    this.#stream.write("\r\x1b[J");
    this.#preview = "";
    this.#previewLines = 0;
  }
}
