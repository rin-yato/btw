import type { Token, Tokens } from "marked";
import { dropWhile, flatMap, join, map, pipe, reverse } from "remeda";
import wrapAnsi from "wrap-ansi";

import { applyStyle, defaultMarkdownTheme, type MarkdownTheme } from "./theme";

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

function trimTrailingLines(lines: string[]): string[] {
  return pipe(
    lines,
    reverse(),
    dropWhile((l) => l === ""),
    reverse(),
  );
}

function hyperlink(label: string, url: string): string {
  if (process.env.NO_TERM_HYPERLINKS) {
    return applyStyle(label, { color: "blue", underline: true });
  }
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}

export class TokenRenderer {
  #width: number;
  #theme: MarkdownTheme;

  constructor(opts: { proseWidth?: number; theme?: MarkdownTheme } = {}) {
    this.#width = opts.proseWidth ?? 88;
    this.#theme = opts.theme ?? defaultMarkdownTheme;
  }

  render(tokens: Token[]): string {
    const lines = this.#renderTokens(tokens);
    return trimTrailingLines(lines).join("\n");
  }

  #renderTokens(tokens: Token[]): string[] {
    const lines: string[] = [];

    for (const token of tokens) {
      switch (token.type) {
        case "space":
          pushBlank(lines);
          break;
        case "heading":
          this.#renderHeading(lines, token as Tokens.Heading);
          break;
        case "paragraph":
          this.#renderParagraph(lines, token as Tokens.Paragraph);
          break;
        case "code":
          this.#renderCode(lines, token as Tokens.Code);
          break;
        default:
          if ("raw" in token) {
            const raw = (token as Token & { raw: string }).raw.trim();
            if (raw) {
              lines.push(...wrap(raw, this.#width));
              pushBlank(lines);
            }
          }
          break;
      }
    }

    return lines;
  }

  #renderHeading(lines: string[], token: Tokens.Heading): void {
    const prefix = `${"#".repeat(token.depth)} `;
    const content = applyStyle(prefix + this.#renderInlines(token.tokens), this.#theme.heading);
    lines.push(...wrap(content, this.#width));
    pushBlank(lines);
  }

  #renderParagraph(lines: string[], token: Tokens.Paragraph): void {
    const text = this.#renderInlines(token.tokens);
    lines.push(...wrap(text, this.#width));
    pushBlank(lines);
  }

  #renderCode(lines: string[], token: Tokens.Code): void {
    const borderStyle = applyStyle("```", this.#theme.codeBlock.border);
    lines.push(borderStyle);

    lines.push(
      ...pipe(
        applyStyle(token.text, this.#theme.codeBlock).split("\n"),
        flatMap((line) => wrap(line, this.#width, { hard: true })),
      ),
    );

    lines.push(borderStyle);
    pushBlank(lines);
  }

  #renderInlines(tokens: Token[] | undefined): string {
    if (!tokens) return "";
    return pipe(
      tokens,
      map((t) => this.#renderInline(t)),
      join(""),
    );
  }

  #renderInline(token: Token): string {
    switch (token.type) {
      case "text":
      case "escape":
        return token.text;
      case "strong":
        return applyStyle(this.#renderInlines(token.tokens), this.#theme.strong);
      case "em":
        return applyStyle(this.#renderInlines(token.tokens), this.#theme.emphasis);
      case "codespan":
        return applyStyle(token.text, this.#theme.inlineCode);
      case "del":
        return applyStyle(this.#renderInlines(token.tokens), this.#theme.deletion);
      case "link": {
        const label = this.#renderInlines(token.tokens);
        return hyperlink(label, token.href);
      }
      case "br":
        return "\n";
      default:
        if ("raw" in token) return (token as Token & { raw: string }).raw;
        return "";
    }
  }
}
