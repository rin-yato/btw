import type { Token, Tokens } from "marked";
import { marked } from "marked";
import pc from "picocolors";
import wrapAnsi from "wrap-ansi";

const ESC = String.fromCharCode(27);
const RE_ANSI = new RegExp(`${ESC}\\[[\\d;]*m`, "g");
const RE_OSC = new RegExp(`${ESC}\\].*?${ESC}\\\\`, "g");

const DEFAULT_PROSE_WIDTH = 88;

type ThemeColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray";

type TextStyle = {
  color?: ThemeColor;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
};

export type MarkdownTheme = {
  heading: TextStyle;
  link: TextStyle;
  inlineCode: TextStyle;
  codeBlock: TextStyle & { border: TextStyle };
  strong: TextStyle;
  emphasis: TextStyle;
  deletion: TextStyle;
};

export const defaultMarkdownTheme: MarkdownTheme = {
  heading: { color: "cyan", bold: true },
  link: { color: "blue" },
  inlineCode: { color: "yellow" },
  codeBlock: { color: "green", border: { dim: true } },
  strong: { color: "magenta", bold: true },
  emphasis: { color: "magenta", italic: true },
  deletion: { strikethrough: true },
};

export type RenderMarkdownOptions = {
  width?: number;
  proseWidth?: number;
  theme?: MarkdownTheme;
};

function applyStyle(text: string, style: TextStyle): string {
  let out: string = text;
  if (style.color) {
    switch (style.color) {
      case "gray":
        out = pc.gray(out);
        break;
      case "black":
        out = pc.black(out);
        break;
      case "red":
        out = pc.red(out);
        break;
      case "green":
        out = pc.green(out);
        break;
      case "yellow":
        out = pc.yellow(out);
        break;
      case "blue":
        out = pc.blue(out);
        break;
      case "magenta":
        out = pc.magenta(out);
        break;
      case "cyan":
        out = pc.cyan(out);
        break;
      case "white":
        out = pc.white(out);
        break;
    }
  }
  if (style.bold) out = pc.bold(out);
  if (style.dim) out = pc.dim(out);
  if (style.italic) out = pc.italic(out);
  if (style.strikethrough) out = pc.strikethrough(out);
  if (style.underline) out = pc.underline(out);
  return out;
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

function wrap(text: string, width: number, opts?: { hard?: boolean }): string[] {
  if (width <= 0) return [text];
  return wrapAnsi(text, width, {
    hard: opts?.hard ?? true,
    trim: true,
    wordWrap: true,
  }).split("\n");
}

function pushBlank(lines: string[]): void {
  if (lines.length === 0 || lines[lines.length - 1] !== "") {
    lines.push("");
  }
}

function findStableBoundary(markdown: string): number {
  const linePattern = markdown.match(/.*(?:\n|$)/g) ?? [];
  let offset = 0;
  let stableEnd = 0;
  let inFence = false;
  let fenceChar: string | undefined;

  for (const line of linePattern) {
    if (line === "") break;
    offset += line.length;
    const trimmed = line.trim();
    const lineComplete = line.endsWith("\n");

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

export function renderMarkdown(markdown: string, options: RenderMarkdownOptions = {}): string {
  const terminalWidth = options.width ?? process.stdout.columns ?? 80;
  const proseWidth = options.proseWidth ?? DEFAULT_PROSE_WIDTH;
  const theme = options.theme ?? defaultMarkdownTheme;
  const pWidth = Math.max(10, Math.min(terminalWidth, proseWidth));

  const tokens = marked.lexer(markdown);
  const lines = renderTokens(tokens, pWidth, theme);
  return trimTrailingLines(lines).join("\n");
}

function trimTrailingLines(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1] === "") end--;
  return lines.slice(0, end);
}

function renderTokens(tokens: Token[], width: number, theme: MarkdownTheme): string[] {
  const lines: string[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "space":
        pushBlank(lines);
        break;
      case "heading":
        renderHeading(lines, token as Tokens.Heading, width, theme);
        break;
      case "paragraph":
        renderParagraph(lines, token as Tokens.Paragraph, width, theme);
        break;
      case "code":
        renderCode(lines, token as Tokens.Code, width, theme);
        break;
      default:
        if ("raw" in token) {
          const raw = (token as Token & { raw: string }).raw.trim();
          if (raw) lines.push(...wrap(raw, width));
          pushBlank(lines);
        }
        break;
    }
  }

  return lines;
}

function renderHeading(
  lines: string[],
  token: Tokens.Heading,
  width: number,
  theme: MarkdownTheme,
): void {
  const prefix = `${"#".repeat(token.depth)} `;
  const content = applyStyle(prefix + renderInlines(token.tokens, theme), theme.heading);
  lines.push(...wrap(content, width));
  pushBlank(lines);
}

function renderParagraph(
  lines: string[],
  token: Tokens.Paragraph,
  width: number,
  theme: MarkdownTheme,
): void {
  const text = renderInlines(token.tokens, theme);
  lines.push(...wrap(text, width));
  pushBlank(lines);
}

function renderCode(
  lines: string[],
  token: Tokens.Code,
  width: number,
  theme: MarkdownTheme,
): void {
  const borderStyle = applyStyle("```", theme.codeBlock.border);
  lines.push(borderStyle);

  const body = applyStyle(token.text, theme.codeBlock);
  for (const line of body.split("\n")) {
    lines.push(...wrap(line, width, { hard: true }));
  }

  lines.push(borderStyle);
  pushBlank(lines);
}

function renderInlines(tokens: Token[] | undefined, theme: MarkdownTheme): string {
  if (!tokens) return "";
  let out = "";
  for (const token of tokens) {
    out += renderInline(token, theme);
  }
  return out;
}

function renderInline(token: Token, theme: MarkdownTheme): string {
  switch (token.type) {
    case "text":
    case "escape":
      return token.text;
    case "strong":
      return applyStyle(renderInlines(token.tokens, theme), theme.strong);
    case "em":
      return applyStyle(renderInlines(token.tokens, theme), theme.emphasis);
    case "codespan":
      return applyStyle(token.text, theme.inlineCode);
    case "del":
      return applyStyle(renderInlines(token.tokens, theme), theme.deletion);
    case "link": {
      const label = renderInlines(token.tokens, theme);
      return hyperlink(label, token.href);
    }
    case "br":
      return "\n";
    default:
      if ("raw" in token) return (token as Token & { raw: string }).raw;
      return "";
  }
}

function hyperlink(label: string, url: string): string {
  const urlAnsi = `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
  if (process.env.NO_TERM_HYPERLINKS) {
    return applyStyle(label, { color: "blue", underline: true });
  }
  return urlAnsi;
}

export class MarkdownRenderer {
  readonly #stream: NodeJS.WriteStream;
  #options: RenderMarkdownOptions;
  #buffer = "";
  #previewLines = 0;

  constructor(opts?: { stream?: NodeJS.WriteStream } & RenderMarkdownOptions) {
    this.#stream = opts?.stream ?? process.stdout;
    this.#options = {
      width: opts?.width,
      proseWidth: opts?.proseWidth,
      theme: opts?.theme,
    };
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
        this.#commitStable(this.#buffer);
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
      this.#commitStable(stable);
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

  #commitStable(text: string): void {
    const rendered = renderMarkdown(text, this.#options);
    if (rendered.length > 0) {
      this.#stream.write(rendered);
      this.#stream.write("\n\n");
    }
  }

  #renderPreview(text: string): void {
    const rendered = renderMarkdown(text, this.#options);
    if (rendered.length === 0) return;
    this.#stream.write(rendered);
    this.#previewLines = countLines(rendered, this.#stream.columns ?? 80);
  }
}
