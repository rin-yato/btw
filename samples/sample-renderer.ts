import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MarkdownRenderer, ThinkingRenderer } from "@/lib/markdown";

function main() {
  const md = readFileSync(join(import.meta.dir, "sample.md"), "utf-8");
  const thinking = readFileSync(join(import.meta.dir, "thinking.md"), "utf-8");

  const renderer = new MarkdownRenderer();
  const thinkingRenderer = new ThinkingRenderer();

  thinkingRenderer.start();
  thinkingRenderer.write(thinking);
  thinkingRenderer.end();

  renderer.write(md);
  renderer.end();
}

main();
