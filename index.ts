import pc from "picocolors";
import { intro, outro } from "@clack/prompts";

import { formatError } from "./src/error";
import { readQuestion, CANCEL } from "./src/input";
import { getModelConfig, streamQuestion } from "./src/ai";
import { parseArgs, printHelp, printVersion } from "./src/cli";

async function handleQuestion(
  question: string,
  noThinking: boolean,
): Promise<void> {
  const config = getModelConfig();
  const controller = new AbortController();

  process.on("SIGINT", () => controller.abort());

  try {
    const stream = streamQuestion(question, config, {
      signal: controller.signal,
    });

    for await (const event of stream) {
      if (event.type === "thinking") {
        if (!noThinking) process.stderr.write(pc.dim(event.delta));
      }
      if (event.type === "text") {
        process.stdout.write(event.delta);
      }
    }

    process.stdout.write("\n");
  } catch (err) {
    if (controller.signal.aborted) {
      process.stdout.write("\n");
      return;
    }
    const msg = formatError(err);
    process.stderr.write(`\n${pc.red("Error:")} ${msg}\n`);
    process.exit(1);
  }
}

async function run(): Promise<void> {
  const parsed = parseArgs(process.argv);

  switch (parsed.mode) {
    case "help":
      printHelp();
      return;
    case "version":
      printVersion();
      return;
    case "no-args": {
      const question = await readQuestion();
      if (question === CANCEL) {
        process.exit(0);
      }

      await handleQuestion(question, parsed.noThinking);
      return;
    }
    case "question": {
      intro(pc.cyan("btw"));

      await handleQuestion(parsed.question!, parsed.noThinking);

      outro(pc.dim("Done"));
      return;
    }
  }
}

run();
