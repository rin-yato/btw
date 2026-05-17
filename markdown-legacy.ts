// @ts-nocheck

import chalk from "chalk";
import { highlight, supportsLanguage } from "cli-highlight";
import { Lexer, lexer, type Token, type Tokens } from "marked";
import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";

const DEFAULT_PROSE_WIDTH = 88;
const MIN_RENDER_WIDTH = 20;

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

type MarkStyle = TextStyle & {
  mark: string;
  width?: number | "full";
};

type RenderLayout = {
  proseWidth: number;
  fullWidth: number;
};

export type MarkdownTheme = {
  heading: TextStyle;
  link: TextStyle & {
    url: TextStyle;
  };
  inlineCode: TextStyle;
  codeBlock: TextStyle & {
    border: TextStyle;
  };
  quote: TextStyle & {
    border: MarkStyle;
  };
  horizontalRule: MarkStyle;
  list: {
    bullet: MarkStyle;
    ordered: TextStyle;
  };
  table: {
    header: TextStyle;
    border: TextStyle;
  };
  strong: TextStyle;
  emphasis: TextStyle;
  deletion: TextStyle;
  thinking: TextStyle & {
    border: MarkStyle;
  };
};

export type RenderMarkdownOptions = {
  width?: number;
  proseWidth?: number;
  theme?: MarkdownTheme;
};

export const defaultMarkdownTheme: MarkdownTheme = {
  heading: { color: "cyan", bold: true },
  link: { color: "blue", url: { dim: true } },
  inlineCode: { color: "yellow" },
  codeBlock: { color: "green", border: { dim: true } },
  quote: { italic: true, border: { mark: "▎ ", dim: true } },
  horizontalRule: { mark: "-", dim: true, width: "full", color: "gray" },
  list: {
    bullet: { mark: "-", color: "cyan" },
    ordered: { color: "cyan" },
  },
  table: {
    header: { color: "cyan", bold: true },
    border: { dim: true },
  },
  strong: { color: "magenta", bold: true },
  emphasis: { color: "magenta", italic: true },
  deletion: { strikethrough: true },
  thinking: {
    color: "yellow",
    dim: true,
    border: { mark: "┃ ", dim: true, color: "yellow" },
  },
};

export class MarkdownStreamWriter {
  private pending = "";
  private previewLines = 0;

  constructor(private readonly options: RenderMarkdownOptions = {}) {}

  write(chunk: string): void {
    this.clearPreview();
    this.pending += chunk;

    const stableEnd = findStableMarkdownBoundary(this.pending);
    if (stableEnd === 0) {
      this.renderPreview();
      return;
    }

    const stable = this.pending.slice(0, stableEnd);
    this.pending = this.pending.slice(stableEnd);
    writeRenderedMarkdown(stable, this.options);
    this.renderPreview();
  }

  finish(): void {
    this.clearPreview();

    if (this.pending.length > 0) {
      writeRenderedMarkdown(this.pending, this.options);
      this.pending = "";
    }
  }

  private renderPreview(): void {
    const lines = renderMarkdown(this.pending, this.options);
    if (lines.length === 0) return;

    process.stdout.write(lines.join("\n"));
    this.previewLines = lines.length;
  }

  private clearPreview(): void {
    if (this.previewLines === 0) return;

    if (this.previewLines > 1) {
      process.stdout.write(`\x1b[${this.previewLines - 1}A`);
    }

    process.stdout.write("\r\x1b[J");
    this.previewLines = 0;
  }
}

export function renderMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {},
): string[] {
  const layout = getRenderLayout(options);
  const theme = options.theme ?? defaultMarkdownTheme;

  const thinkingBlocks: string[] = [];
  const processed = markdown.replace(
    /<thinking>([\s\S]*?)<\/thinking>/g,
    (_, content: string) => {
      const id = thinkingBlocks.length;
      thinkingBlocks.push(content.trim());
      return `\x00THINKING_${id}\x00`;
    },
  );

  const tokens = lexer(processed.replace(/\t/g, "   "));
  const lines = renderTokens(tokens, layout, theme);

  const result: string[] = [];
  for (const line of lines) {
    const match = line.match(/\x00THINKING_(\d+)\x00/);
    if (match) {
      renderThinkingBlock(result, thinkingBlocks[Number.parseInt(match[1], 10)], layout, theme);
    } else {
      result.push(line);
    }
  }

  return trimTrailingBlankLines(result);
}

function writeRenderedMarkdown(markdown: string, options: RenderMarkdownOptions): void {
  const lines = renderMarkdown(markdown, options);
  if (lines.length === 0) return;

  process.stdout.write(`${lines.join("\n")}\n\n`);
}

function getRenderLayout(options: RenderMarkdownOptions): RenderLayout {
  const terminalWidth = Math.max(
    MIN_RENDER_WIDTH,
    options.width ?? process.stdout.columns ?? 80,
  );
  const proseWidth = options.proseWidth ?? DEFAULT_PROSE_WIDTH;
  return {
    fullWidth: terminalWidth,
    proseWidth: Math.max(MIN_RENDER_WIDTH, Math.min(terminalWidth, proseWidth)),
  };
}

function renderTokens(tokens: Token[], layout: RenderLayout, theme: MarkdownTheme): string[] {
  const lines: string[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "space":
        pushBlank(lines);
        break;
      case "heading":
        renderHeading(lines, token as Tokens.Heading, layout.proseWidth, theme);
        break;
      case "paragraph":
        renderParagraph(lines, token as Tokens.Paragraph, layout, theme);
        break;
      case "text":
        renderTextBlock(lines, token as Tokens.Text, layout, theme);
        break;
      case "code":
        renderCode(lines, token as Tokens.Code, layout.proseWidth, theme);
        break;
      case "blockquote":
        renderBlockquote(lines, token as Tokens.Blockquote, layout, theme);
        break;
      case "list":
        renderList(lines, token as Tokens.List, layout, theme);
        pushBlank(lines);
        break;
      case "hr":
        lines.push(
          applyStyle(
            theme.horizontalRule.mark.repeat(
              getRuleWidth(theme.horizontalRule, layout.proseWidth),
            ),
            theme.horizontalRule,
          ),
        );
        pushBlank(lines);
        break;
      case "html":
        renderPlainBlock(lines, token.text, layout.proseWidth);
        break;
      case "table":
        renderTable(lines, token as Tokens.Table, layout.proseWidth, theme);
        pushBlank(lines);
        break;
      default:
        if ("raw" in token) renderPlainBlock(lines, token.raw, layout.proseWidth);
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
  const content = prefix + renderInlineTokens(token.tokens, theme);
  const text = applyStyle(content, theme.heading);

  lines.push(...wrap(text, width));
  pushBlank(lines);
}

function renderParagraph(
  lines: string[],
  token: Tokens.Paragraph,
  layout: RenderLayout,
  theme: MarkdownTheme,
): void {
  const text = renderInlineTokens(token.tokens, theme);
  if (renderPipeTableBlock(lines, text, layout, theme)) return;

  lines.push(...wrap(text, layout.proseWidth));
  pushBlank(lines);
}

function renderTextBlock(
  lines: string[],
  token: Tokens.Text,
  layout: RenderLayout,
  theme: MarkdownTheme,
): void {
  const text = token.tokens ? renderInlineTokens(token.tokens, theme) : token.text;
  if (renderPipeTableBlock(lines, text, layout, theme)) return;

  lines.push(...wrap(text, layout.proseWidth));
  pushBlank(lines);
}

function renderCode(
  lines: string[],
  token: Tokens.Code,
  width: number,
  theme: MarkdownTheme,
): void {
  lines.push(applyStyle(`\`\`\`${token.lang ?? ""}`, theme.codeBlock.border));

  const highlighted = highlightCode(token.text, token.lang, theme);
  for (const line of highlighted) {
    lines.push(...wrapCodeLine(line, width));
  }

  lines.push(applyStyle("```", theme.codeBlock.border));
  pushBlank(lines);
}

function wrapCodeLine(line: string, width: number): string[] {
  return wrap(line, width, { hard: true, trim: false });
}

function renderBlockquote(
  lines: string[],
  token: Tokens.Blockquote,
  layout: RenderLayout,
  theme: MarkdownTheme,
): void {
  const quoteWidth = Math.max(1, layout.proseWidth - stringWidth(theme.quote.border.mark));
  const rendered = trimTrailingBlankLines(
    renderTokens(token.tokens, { ...layout, proseWidth: quoteWidth }, theme),
  );
  const prefix = applyStyle(theme.quote.border.mark, theme.quote.border);

  for (const line of rendered) {
    lines.push(prefix + applyStyle(line, theme.quote));
  }

  pushBlank(lines);
}

function renderList(
  lines: string[],
  token: Tokens.List,
  layout: RenderLayout,
  theme: MarkdownTheme,
): void {
  const start = typeof token.start === "number" ? token.start : 1;

  token.items.forEach((item, index) => {
    const markerText = token.ordered ? `${start + index}. ` : `${theme.list.bullet.mark} `;
    const checkbox = item.task ? `[${item.checked ? "x" : " "}] ` : "";
    const markerStyle = token.ordered ? theme.list.ordered : theme.list.bullet;
    const marker = applyStyle(markerText + checkbox, markerStyle);
    const markerWidth = stringWidth(markerText + checkbox);
    const indent = " ".repeat(markerWidth);
    const itemWidth = Math.max(1, layout.proseWidth - markerWidth);
    const itemLines = trimTrailingBlankLines(
      renderListItem(item, { ...layout, proseWidth: itemWidth }, theme),
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
}

function renderListItem(
  item: Tokens.ListItem,
  layout: RenderLayout,
  theme: MarkdownTheme,
): string[] {
  const tokens = item.task
    ? item.tokens.filter((token) => token.type !== "checkbox")
    : item.tokens;

  return renderTokens(tokens, layout, theme);
}

function renderTable(
  lines: string[],
  token: Tokens.Table,
  width: number,
  theme: MarkdownTheme,
): void {
  const rows = [token.header, ...token.rows].map((row) =>
    row.map((cell) => renderTableCell(cell, theme)),
  );

  lines.push(...renderTerminalTable(rows, width, theme));
}

function renderTableCell(cell: Tokens.TableCell, theme: MarkdownTheme): string {
  return cell.tokens.length > 0
    ? renderInlineTokens(cell.tokens, theme)
    : renderInlineMarkdown(cell.text, theme);
}

function renderPlainBlock(lines: string[], text: string, width: number): void {
  const plain = text.trim();
  if (!plain) return;

  lines.push(...wrap(plain, width));
  pushBlank(lines);
}

function renderThinkingBlock(
  lines: string[],
  content: string,
  layout: RenderLayout,
  theme: MarkdownTheme,
): void {
  const prefixWidth = stringWidth(theme.thinking.border.mark);
  const innerWidth = Math.max(1, layout.proseWidth - prefixWidth);
  const innerTokens = lexer(content.replace(/\t/g, "   "));
  const innerLines = trimTrailingBlankLines(
    renderTokens(innerTokens, { ...layout, proseWidth: innerWidth }, theme),
  );
  const prefix = applyStyle(theme.thinking.border.mark, theme.thinking.border);

  for (const line of innerLines) {
    lines.push(prefix + applyStyle(line, theme.thinking));
  }

  pushBlank(lines);
}

function renderPipeTableBlock(
  lines: string[],
  text: string,
  layout: RenderLayout,
  theme: MarkdownTheme,
): boolean {
  const rawLines = text.split("\n");
  const firstTableLine = rawLines.findIndex((line) => isPipeTableRow(line));
  if (firstTableLine === -1) return false;

  const rows: string[][] = [];
  let endTableLine = firstTableLine;
  let columnCount: number | undefined;

  for (let index = firstTableLine; index < rawLines.length; index++) {
    const row = parsePipeTableRow(rawLines[index]);
    if (!row) break;
    if (columnCount === undefined) columnCount = row.length;
    if (row.length !== columnCount) break;

    endTableLine = index + 1;
    if (isPipeTableSeparatorRow(row)) continue;
    rows.push(row.map((cell) => renderInlineMarkdown(cell, theme)));
  }

  if (rows.length < 2) return false;

  const before = rawLines.slice(0, firstTableLine).join("\n").trim();
  if (before) lines.push(...wrap(before, layout.proseWidth));

  lines.push(...renderTerminalTable(rows, layout.proseWidth, theme));

  const after = rawLines.slice(endTableLine).join("\n").trim();
  if (after) lines.push(...wrap(after, layout.proseWidth));

  pushBlank(lines);
  return true;
}

function renderTerminalTable(rows: string[][], width: number, theme: MarkdownTheme): string[] {
  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? ""),
  );
  const columnWidths = getTableColumnWidths(normalizedRows, width);
  const output: string[] = [renderTableBorder(columnWidths, "top", theme)];

  normalizedRows.forEach((row, rowIndex) => {
    output.push(...renderTableRow(row, columnWidths, rowIndex === 0, theme));

    output.push(
      renderTableBorder(
        columnWidths,
        rowIndex === normalizedRows.length - 1 ? "bottom" : "middle",
        theme,
      ),
    );
  });

  return output;
}

function renderTableRow(
  row: string[],
  columnWidths: number[],
  header: boolean,
  theme: MarkdownTheme,
): string[] {
  const wrappedCells = row.map((cell, index) =>
    wrap(header ? applyStyle(cell, theme.table.header) : cell, columnWidths[index]),
  );
  const rowHeight = Math.max(...wrappedCells.map((cell) => cell.length));
  const lines: string[] = [];

  for (let lineIndex = 0; lineIndex < rowHeight; lineIndex++) {
    lines.push(
      applyStyle("│", theme.table.border) +
        wrappedCells
          .map(
            (cell, cellIndex) =>
              ` ${padAnsiEnd(cell[lineIndex] ?? "", columnWidths[cellIndex])} `,
          )
          .join(applyStyle("│", theme.table.border)) +
        applyStyle("│", theme.table.border),
    );
  }

  return lines;
}

function renderTableBorder(
  columnWidths: number[],
  position: "top" | "middle" | "bottom",
  theme: MarkdownTheme,
): string {
  const chars = {
    top: ["┌", "┬", "┐"],
    middle: ["├", "┼", "┤"],
    bottom: ["└", "┴", "┘"],
  }[position];
  const border =
    chars[0] +
    columnWidths.map((columnWidth) => "─".repeat(columnWidth + 2)).join(chars[1]) +
    chars[2];

  return applyStyle(border, theme.table.border);
}

function getTableColumnWidths(rows: string[][], width: number): number[] {
  const columnCount = rows[0]?.length ?? 0;
  if (columnCount === 0) return [];

  const horizontalPadding = columnCount * 2;
  const verticalBorders = columnCount + 1;
  const availableWidth = Math.max(columnCount, width - horizontalPadding - verticalBorders);
  const naturalWidths = Array.from({ length: columnCount }, (_, columnIndex) =>
    Math.max(...rows.map((row) => stringWidth(row[columnIndex] ?? "")), 1),
  );
  const widths = [...naturalWidths];

  let total = widths.reduce((sum, columnWidth) => sum + columnWidth, 0);
  while (total > availableWidth) {
    const shrinkIndex = widths.findIndex(
      (columnWidth) => columnWidth === Math.max(...widths) && columnWidth > 1,
    );
    if (shrinkIndex === -1) break;

    widths[shrinkIndex]--;
    total--;
  }

  let remaining = availableWidth - total;
  let index = 0;
  while (remaining > 0) {
    widths[index % columnCount]++;
    index++;
    remaining--;
  }

  return widths;
}

function isPipeTableRow(line: string): boolean {
  return parsePipeTableRow(line) !== undefined;
}

function isPipeTableSeparatorRow(row: string[]): boolean {
  return row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parsePipeTableRow(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return undefined;

  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

  return cells.length >= 2 ? cells : undefined;
}

function padAnsiEnd(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - stringWidth(text)));
}

function getRuleWidth(style: MarkStyle, width: number): number {
  return style.width === "full" ? width : Math.min(style.width ?? width, width);
}

function renderInlineTokens(tokens: Token[] = [], theme: MarkdownTheme): string {
  return tokens.map((token) => renderInlineToken(token, theme)).join("");
}

function renderInlineMarkdown(text: string, theme: MarkdownTheme): string {
  return renderInlineTokens(Lexer.lexInline(text), theme);
}

function renderInlineToken(token: Token, theme: MarkdownTheme): string {
  switch (token.type) {
    case "text":
    case "escape":
      return "tokens" in token && token.tokens
        ? renderInlineTokens(token.tokens, theme)
        : token.text;
    case "strong":
      return applyStyle(renderInlineTokens(token.tokens, theme), theme.strong);
    case "em":
      return applyStyle(renderInlineTokens(token.tokens, theme), theme.emphasis);
    case "codespan":
      return applyStyle(token.text, theme.inlineCode);
    case "del":
      return applyStyle(renderInlineTokens(token.tokens, theme), theme.deletion);
    case "link": {
      const label = applyStyle(renderInlineTokens(token.tokens, theme), theme.link);
      return hyperlink(label, token.href);
    }
    case "image":
      return applyStyle(`[image: ${token.text || token.href}]`, theme.link.url);
    case "br":
      return "\n";
    case "html":
      return token.text;
    default:
      return "raw" in token ? token.raw : "";
  }
}

function highlightCode(code: string, lang: string | undefined, theme: MarkdownTheme): string[] {
  try {
    const highlighted = highlight(code, {
      ignoreIllegals: true,
      language: lang && supportsLanguage(lang) ? lang : undefined,
    });

    return highlighted.split("\n");
  } catch {
    return code.split("\n").map((line) => applyStyle(line, theme.codeBlock));
  }
}

function applyStyle(text: string, style: TextStyle): string {
  let styled = text;

  if (style.color) styled = chalk[style.color](styled);
  if (style.bold) styled = chalk.bold(styled);
  if (style.dim) styled = chalk.dim(styled);
  if (style.italic) styled = chalk.italic(styled);
  if (style.strikethrough) styled = chalk.strikethrough(styled);
  if (style.underline) styled = chalk.underline(styled);

  return styled;
}

function hyperlink(label: string, url: string): string {
  return `\x1b]8;;${url}\x07${label}\x1b]8;;\x07`;
}

function wrap(
  text: string,
  width: number,
  options: { hard?: boolean; trim?: boolean } = {},
): string[] {
  return wrapAnsi(text, width, {
    hard: options.hard ?? true,
    trim: options.trim ?? true,
    wordWrap: true,
  }).split("\n");
}

function pushBlank(lines: string[]): void {
  if (lines.length === 0 || lines[lines.length - 1] !== "") {
    lines.push("");
  }
}

function trimTrailingBlankLines(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1] === "") end--;
  return lines.slice(0, end);
}

function findStableMarkdownBoundary(markdown: string): number {
  const lines = markdown.match(/.*(?:\n|$)/g) ?? [];
  let offset = 0;
  let stableEnd = 0;
  let inFence = false;
  let fenceMarker: string | undefined;
  let inThinking = false;

  for (const line of lines) {
    if (line === "") break;

    offset += line.length;
    const lineComplete = line.endsWith("\n");
    const trimmed = line.trim();
    const fence = trimmed.match(/^(`{3,}|~{3,})/);

    if (trimmed.includes("<thinking>")) {
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

    if (fence) {
      const marker = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = undefined;
        stableEnd = offset;
      }

      continue;
    }

    if (inFence) continue;

    if (trimmed === "") {
      stableEnd = offset;
    } else if (
      lineComplete &&
      (/^#{1,6}\s+/.test(trimmed) || /^(-{3,}|_{3,}|\*{3,})$/.test(trimmed))
    ) {
      stableEnd = offset;
    }
  }

  return stableEnd;
}
