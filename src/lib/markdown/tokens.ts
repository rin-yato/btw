import { isOk, makeSafe } from "@justmiracle/result";
import { highlight, supportsLanguage } from "cli-highlight";
import type { Token, Tokens } from "marked";
import { dropWhile, join, map, pipe, reverse } from "remeda";
import wrapAnsi from "wrap-ansi";

import { applyStyle, defaultMarkdownTheme, type MarkdownTheme } from "./theme";

const safeHighlight = makeSafe(highlight);

const ESC = String.fromCharCode(27);
const RE_ANSI = new RegExp(`${ESC}\\[[\\d;]*m`, "g");
const RE_OSC = new RegExp(`${ESC}\\].*?${ESC}\\\\`, "g");

function visibleWidth(s: string): number {
  return s.replace(RE_ANSI, "").replace(RE_OSC, "").length;
}

function wrap(
  text: string,
  width: number,
  opts?: { hard?: boolean; trim?: boolean },
): string[] {
  if (width <= 0) return [text];
  return wrapAnsi(text, width, {
    hard: opts?.hard ?? true,
    trim: opts?.trim ?? true,
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

  #renderTokens(tokens: Token[], width?: number): string[] {
    const w = width ?? this.#width;
    const lines: string[] = [];
    for (const token of tokens) {
      lines.push(...this.#renderToken(token, w));
    }
    return lines;
  }

  #renderToken(token: Token, w: number): string[] {
    switch (token.type) {
      case "space":
        return [];
      case "text":
        return this.#renderText(token as Tokens.Text, w);
      case "heading":
        return this.#renderHeading(token as Tokens.Heading, w);
      case "paragraph":
        return this.#renderParagraph(token as Tokens.Paragraph, w);
      case "code":
        return this.#renderCode(token as Tokens.Code, w);
      case "blockquote":
        return this.#renderBlockquote(token as Tokens.Blockquote, w);
      case "list":
        return this.#renderList(token as Tokens.List, w);
      case "hr":
        return this.#renderHr(w);
      case "table":
        return this.#renderTable(token as Tokens.Table, w);
      default:
        if ("raw" in token) {
          const raw = (token as Token & { raw: string }).raw.trim();
          if (raw) return [...wrap(raw, w), ""];
        }
        return [];
    }
  }

  #renderText(token: Tokens.Text, width: number): string[] {
    const text = token.tokens ? this.#renderInlines(token.tokens) : token.text;
    return [...wrap(text, width), ""];
  }

  #renderHeading(token: Tokens.Heading, width: number): string[] {
    const prefix = `${"#".repeat(token.depth)} `;
    const content = applyStyle(prefix + this.#renderInlines(token.tokens), this.#theme.heading);
    return [...wrap(content, width), ""];
  }

  #renderParagraph(token: Tokens.Paragraph, width: number): string[] {
    const text = this.#renderInlines(token.tokens);
    return [...wrap(text, width), ""];
  }

  #renderCode(token: Tokens.Code, width: number): string[] {
    const fenceOpen = applyStyle(`\`\`\`${token.lang ?? ""}`, this.#theme.codeBlock.border);
    const highlighted = this.#highlightCode(token.text, token.lang);
    const codeLines = highlighted.flatMap((line) =>
      wrap(line, width, { hard: true, trim: false }),
    );
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

  #renderBlockquote(token: Tokens.Blockquote, width: number): string[] {
    const border = this.#theme.quote.border;
    const borderWidth = visibleWidth(border.mark);
    const innerWidth = Math.max(1, width - borderWidth);
    const inner = new TokenRenderer({ proseWidth: innerWidth, theme: this.#theme });
    const rendered = inner.render(token.tokens);
    if (!rendered) return [""];
    const prefix = applyStyle(border.mark, border);
    return rendered
      .split("\n")
      .map((line) => prefix + applyStyle(line, this.#theme.quote))
      .concat([""]);
  }

  #renderList(token: Tokens.List, width: number): string[] {
    const start = typeof token.start === "number" ? token.start : 1;
    const lines: string[] = [];

    token.items.forEach((item, index) => {
      const markerText = token.ordered
        ? `${start + index}. `
        : `${this.#theme.list.bullet.mark} `;
      const checkbox = item.task ? `[${item.checked ? "x" : " "}] ` : "";
      const markerStyle = token.ordered ? this.#theme.list.ordered : this.#theme.list.bullet;
      const marker = applyStyle(markerText + checkbox, markerStyle);
      const markerWidth = visibleWidth(markerText + checkbox);
      const indent = " ".repeat(markerWidth);
      const itemWidth = Math.max(1, width - markerWidth);

      const itemTokens = item.task
        ? item.tokens.filter((t) => t.type !== "checkbox")
        : item.tokens;

      const itemLines = trimTrailingLines(this.#renderTokens(itemTokens, itemWidth)).filter(
        (l) => l !== "",
      );

      if (itemLines.length === 0) {
        lines.push(marker.trimEnd());
        return;
      }

      lines.push(marker + itemLines[0]);
      for (const line of itemLines.slice(1)) {
        lines.push(indent + line);
      }
    });

    lines.push("");
    return lines;
  }

  #renderHr(width: number): string[] {
    const rule = this.#theme.horizontalRule;
    const count = rule.width === "full" ? width : Math.min(rule.width ?? width, width);
    return [applyStyle(rule.mark.repeat(count), rule), ""];
  }

  #renderTable(token: Tokens.Table, width: number): string[] {
    const renderCell = (cell: Tokens.TableCell): string =>
      cell.tokens.length > 0 ? this.#renderInlines(cell.tokens) : cell.text;

    const allRows = [token.header, ...token.rows];
    const renderedRows = allRows.map((row) => row.map(renderCell));

    const columnCount = Math.max(...renderedRows.map((row) => row.length));
    const normalizedRows = renderedRows.map((row) =>
      Array.from({ length: columnCount }, (_, i) => row[i] ?? ""),
    );

    const columnWidths = getTableColumnWidths(normalizedRows, width);
    const lines: string[] = [];

    lines.push(renderTableBorder(columnWidths, "top", this.#theme));
    normalizedRows.forEach((row, i) => {
      lines.push(...renderTableRow(row, columnWidths, i === 0, this.#theme));
      const pos = i === normalizedRows.length - 1 ? "bottom" : "middle";
      lines.push(renderTableBorder(columnWidths, pos, this.#theme));
    });

    lines.push("");
    return lines;
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
        const label = applyStyle(this.#renderInlines(token.tokens), this.#theme.link);
        return hyperlink(label, token.href);
      }
      case "image":
        return applyStyle(`[image: ${token.text || token.href}]`, this.#theme.link.url);
      case "br":
        return "\n";
      default:
        if ("raw" in token) return (token as Token & { raw: string }).raw;
        return "";
    }
  }
}

function getTableColumnWidths(rows: string[][], width: number): number[] {
  const columnCount = rows[0]?.length ?? 0;
  if (columnCount === 0) return [];

  const horizontalPadding = columnCount * 2;
  const verticalBorders = columnCount + 1;
  const availableWidth = Math.max(columnCount, width - horizontalPadding - verticalBorders);

  const naturalWidths = Array.from({ length: columnCount }, (_, col) =>
    Math.max(...rows.map((row) => visibleWidth(row[col] ?? "")), 1),
  );

  const widths = [...naturalWidths];
  let total = widths.reduce((a, b) => a + b, 0);

  while (total > availableWidth) {
    const max = Math.max(...widths);
    const shrinkIndex = widths.findIndex((cw) => cw === max && cw > 1);
    if (shrinkIndex === -1) break;
    const current = widths[shrinkIndex];
    if (current === undefined) break;
    widths[shrinkIndex] = current - 1;
    total--;
  }

  let remaining = availableWidth - total;
  let idx = 0;
  while (remaining > 0) {
    const col = idx % columnCount;
    widths[col] = (widths[col] ?? 0) + 1;
    idx++;
    remaining--;
  }

  return widths;
}

function renderTableBorder(
  columnWidths: number[],
  position: "top" | "middle" | "bottom",
  theme: MarkdownTheme,
): string {
  const [left, mid, right] =
    position === "top"
      ? (["┌", "┬", "┐"] as const)
      : position === "middle"
        ? (["├", "┼", "┤"] as const)
        : (["└", "┴", "┘"] as const);

  const border = left + columnWidths.map((w) => "─".repeat(w + 2)).join(mid) + right;
  return applyStyle(border, theme.table.border);
}

function renderTableRow(
  row: string[],
  columnWidths: number[],
  header: boolean,
  theme: MarkdownTheme,
): string[] {
  const styled = header ? row.map((cell) => applyStyle(cell, theme.table.header)) : row;
  const wrappedCells = styled.map((cell, i) => wrap(cell, columnWidths[i] ?? 0));
  const rowHeight = Math.max(...wrappedCells.map((c) => c.length));

  const lines: string[] = [];
  for (let li = 0; li < rowHeight; li++) {
    const sep = applyStyle("│", theme.table.border);
    const cells = wrappedCells
      .map((cell, ci) => ` ${padEnd(cell[li] ?? "", columnWidths[ci] ?? 0)} `)
      .join(sep);
    lines.push(sep + cells + sep);
  }
  return lines;
}

function padEnd(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}
