import { MarkdownRenderer } from "./stream";
import type { RenderMarkdownOptions } from "./theme";

type ThinkingRendererOptions = {
  stream?: NodeJS.WriteStream;
} & Omit<RenderMarkdownOptions, "linePrefix" | "lineStyle">;

export class ThinkingRenderer {
  #renderer: MarkdownRenderer;
  #hasContent = false;

  constructor(opts: ThinkingRendererOptions = {}) {
    this.#renderer = new MarkdownRenderer({
      ...opts,
      stream: opts.stream ?? process.stderr,
      linePrefix: { mark: "┃ ", dim: true, color: "yellow" },
      lineStyle: { dim: true },
    });
  }

  start(): void {
    this.#hasContent = false;
  }

  write(delta: string): void {
    if (delta.length > 0) this.#hasContent = true;
    this.#renderer.writeText(delta);
  }

  end(): void {
    if (!this.#hasContent) return;
    this.#renderer.end();
    this.#hasContent = false;
  }
}
