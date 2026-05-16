#!/usr/bin/env node

import { AuthService, getAuthDir } from "@/lib/auth";
import { JsonStore } from "@/lib/json-store";

import { isErr } from "@justmiracle/result";
import pc from "picocolors";

import { parseArgs, printHelp, printVersion } from "@/cli";
import { connectFlow } from "@/cmd/connect";
import { askQuestion, CANCEL, readQuestion } from "@/cmd/question";
import { formatError } from "@/error";

async function run(): Promise<void> {
  const parsedResult = parseArgs(process.argv);

  if (isErr(parsedResult)) {
    process.stderr.write(`\n${pc.red("Error:")} ${formatError(parsedResult.error)}\n`);
    process.exit(1);
  }

  const parsed = parsedResult.value;

  switch (parsed.mode) {
    case "help":
      printHelp();
      return;
    case "version":
      printVersion();
      return;
    case "connect": {
      const auth = new AuthService(new JsonStore({ dir: getAuthDir(), filename: "auth.json" }));
      const result = await connectFlow(auth);
      if (isErr(result)) {
        process.stderr.write(`\n${pc.red("Error:")} ${formatError(result.error)}\n`);
        process.exit(1);
      }
      return;
    }
    case "no-args": {
      const question = await readQuestion();
      if (question === CANCEL) process.exit(0);
      await askQuestion(question, parsed.noThinking, parsed.modelOverride);
      return;
    }
    case "question":
      await askQuestion(parsed.question, parsed.noThinking, parsed.modelOverride);
      return;
  }
}

void run();
