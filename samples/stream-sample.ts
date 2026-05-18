import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MarkdownRenderer, ThinkingRenderer } from "@/lib/markdown";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const md = readFileSync(join(import.meta.dir, "sample.md"), "utf-8");
  const thinking = readFileSync(join(import.meta.dir, "thinking.md"), "utf-8");

  const renderer = new MarkdownRenderer();
  const thinkingRenderer = new ThinkingRenderer();

  thinkingRenderer.start();
  for (const char of thinking) {
    thinkingRenderer.write(char);
    await delay(10);
  }
  thinkingRenderer.end();

  for (const char of md) {
    renderer.write(char);
    await delay(10);
  }

  renderer.end();
}

main();
