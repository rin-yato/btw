#!/usr/bin/env node

import pc from "picocolors";

import { getModelConfig, streamQuestion } from "@/ai";
import { parseArgs, printHelp, printVersion } from "@/cli";
import { readConfig } from "@/config";
import { connectFlow } from "@/connect";
import { formatError } from "@/error";
import { CANCEL, readQuestion } from "@/input";

async function handleQuestion(
  question: string,
  noThinking: boolean,
  _modelOverride?: string,
): Promise<void> {
  const config = await getModelConfig();
  const cfg = await readConfig();
  const hideThinking = noThinking || cfg?.showThinking === false;
  const controller = new AbortController();

  process.on("SIGINT", () => controller.abort());

  try {
    const stream = streamQuestion(question, config, {
      signal: controller.signal,
    });

    for await (const event of stream) {
      if (event.type === "thinking") {
        if (!hideThinking) process.stderr.write(pc.dim(event.delta));
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
    case "connect":
      await connectFlow();
      return;
    case "no-args": {
      const question = await readQuestion();
      if (question === CANCEL) {
        process.exit(0);
      }

      await handleQuestion(question, parsed.noThinking, parsed.modelOverride);
      return;
    }
    case "question": {
      await handleQuestion(parsed.question!, parsed.noThinking, parsed.modelOverride);
      return;
    }
  }
}

void run();
