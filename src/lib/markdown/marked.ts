import { Marked, type TokenizerThis, type Tokens } from "marked";

const marked = new Marked();

marked.use({
  extensions: [
    {
      name: "thinking",
      level: "block",
      start(this: TokenizerThis, src: string): number | undefined {
        return src.indexOf("<thinking>");
      },
      tokenizer(this: TokenizerThis, src: string): Tokens.Generic | undefined {
        const closed = /^<thinking>([\s\S]*?)<\/thinking>/s.exec(src);
        if (closed) {
          return {
            type: "thinking",
            raw: closed[0],
            text: (closed[1] ?? "").trim(),
          };
        }
        const open = /^<thinking>([\s\S]*)$/s.exec(src);
        if (open) {
          return {
            type: "thinking",
            raw: open[0],
            text: (open[1] ?? "").trim(),
          };
        }
      },
    },
  ],
});

export { marked };
