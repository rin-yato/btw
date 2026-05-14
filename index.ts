import { parseArgs, printHelp, printVersion } from "./src/cli.ts";
import { getModelConfig, streamQuestion } from "./src/ai.ts";
import { formatError } from "./src/error.ts";

async function run(): Promise<void> {
  const parsed = parseArgs(process.argv);

  switch (parsed.mode) {
    case "help":
      printHelp();
      return;
    case "version":
      printVersion();
      return;
    case "no-args":
      console.log("Input mode coming soon!");
      return;
    case "question": {
      const question = parsed.question!;
      const config = getModelConfig();
      const controller = new AbortController();

      process.on("SIGINT", () => {
        controller.abort();
      });

      try {
        const stream = streamQuestion(question, config, {
          signal: controller.signal,
        });

        for await (const event of stream) {
          if (event.type === "thinking" && parsed.noThinking) continue;
          if (event.type === "text") {
            process.stdout.write(event.delta);
          }
          if (event.type === "thinking") {
            process.stderr.write(event.delta);
          }
        }

        process.stdout.write("\n");
      } catch (err) {
        if (controller.signal.aborted) {
          if (err instanceof Error && err.name === "AbortError") {
            process.stdout.write("\n");
            return;
          }
        }
        const msg = formatError(err);
        process.stderr.write(`\nError: ${msg}\n`);
        process.exit(1);
      }
      return;
    }
  }
}

run();
