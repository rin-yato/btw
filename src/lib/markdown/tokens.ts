import { isOk, makeSafe } from "@justmiracle/result";
import { highlight, supportsLanguage } from "cli-highlight";
import type { Token, Tokens } from "marked";
import { dropWhile, join, map, pipe, reverse } from "remeda";
import wrapAnsi from "wrap-ansi";

import { applyStyle, defaultMarkdownTheme, type MarkdownTheme } from "./theme";

const safeHighlight = makeSafe(highlight);

function wrap(text: string, width: number, opts?: { hard?: boolean }): string[] {
  if (width <= 0) return [text];
  return wrapAnsi(text, width, {
    hard: opts?.hard ?? true,
    trim: true,
    wordWrap: true,
  }).split("\n");
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
    return trimTrailingLines(this.#renderTokens(tokens)).join("\n");
  }

  #renderTokens(tokens: Token[]): string[] {
    const lines: string[] = [];
    for (const token of tokens) {
      lines.push(...this.#renderToken(token));
    }
    return lines;
  }

  #renderToken(token: Token): string[] {
    switch (token.type) {
      case "space":
        return [];
      case "heading":
        return this.#renderHeading(token as Tokens.Heading);
      case "paragraph":
        return this.#renderParagraph(token as Tokens.Paragraph);
      case "code":
        return this.#renderCode(token as Tokens.Code);
      default:
        if ("raw" in token) {
          const raw = (token as Token & { raw: string }).raw.trim();
          if (raw) return [...wrap(raw, this.#width), ""];
        }
        return [];
    }
  }

  #renderHeading(token: Tokens.Heading): string[] {
    const prefix = `${"#".repeat(token.depth)} `;
    const content = applyStyle(prefix + this.#renderInlines(token.tokens), this.#theme.heading);
    return [...wrap(content, this.#width), ""];
  }

  #renderParagraph(token: Tokens.Paragraph): string[] {
    const text = this.#renderInlines(token.tokens);
    return [...wrap(text, this.#width), ""];
  }

  #renderCode(token: Tokens.Code): string[] {
    const fenceOpen = applyStyle(`\`\`\`${token.lang ?? ""}`, this.#theme.codeBlock.border);
    const highlighted = this.#highlightCode(token.text, token.lang);
    const codeLines = highlighted.flatMap((line) => wrap(line, this.#width, { hard: true }));
    const fenceClose = applyStyle("```", this.#theme.codeBlock.border);
    return [fenceOpen, ...codeLines, fenceClose, ""];
  }

  #highlightCode(code: string, lang: string | undefined): string[] {
    const result = safeHighlight(code, {
      ignoreIllegals: true,
      language: lang && supportsLanguage(lang) ? lang : undefined,
    });
    return isOk(result)
      ? result.value.split("\n")
      : applyStyle(code, this.#theme.codeBlock).split("\n");
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
