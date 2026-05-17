import { readFileSync } from "node:fs";
import { join } from "node:path";

import { MarkdownRenderer } from "@/lib/markdown";

function main() {
  const md = readFileSync(join(import.meta.dir, "sample.md"), "utf-8");

  const renderer = new MarkdownRenderer();
  renderer.write(md);
  renderer.end();
}

main();
