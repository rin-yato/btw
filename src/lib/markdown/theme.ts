import pc from "picocolors";
import { constant, isTruthy, pipe, when } from "remeda";

export type ThemeColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | `#${string}`;

export type TextStyle = {
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

const RE_HEX = /^#[0-9a-fA-F]{6}$/;

const COLOR_FN: Record<string, (s: string) => string> = {
  gray: pc.gray,
  black: pc.black,
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  magenta: pc.magenta,
  cyan: pc.cyan,
  white: pc.white,
};

function colorText(color: ThemeColor | undefined) {
  return (text: string) => {
    if (!color) return text;

    const fn = COLOR_FN[color];
    if (fn) return fn(text);

    if (RE_HEX.test(color)) {
      const r = Number.parseInt(color.slice(1, 3), 16);
      const g = Number.parseInt(color.slice(3, 5), 16);
      const b = Number.parseInt(color.slice(5, 7), 16);
      return `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
    }

    return text;
  };
}

export function applyStyle(text: string, style: TextStyle): string {
  return pipe(
    text,
    when(constant(isTruthy(style.color)), colorText(style.color)),
    when(constant(isTruthy(style.bold)), pc.bold),
    when(constant(isTruthy(style.dim)), pc.dim),
    when(constant(isTruthy(style.italic)), pc.italic),
    when(constant(isTruthy(style.strikethrough)), pc.strikethrough),
    when(constant(isTruthy(style.underline)), pc.underline),
  );
}
