#!/usr/bin/env node

import { AuthService, getAuthDir } from "@/lib/auth";
import { JsonStore } from "@/lib/json-store";

import { isErr } from "@justmiracle/result";
import pc from "picocolors";

import { parseArgs, printHelp, printVersion } from "@/cli";
import { connectCmd } from "@/cmd/connect";
import { promptCmd, questionCmd } from "@/cmd/question";
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
      const result = await connectCmd(auth);
      if (isErr(result)) {
        process.stderr.write(`\n${pc.red("Error:")} ${formatError(result.error)}\n`);
        process.exit(1);
      }
      return;
    }
    case "no-args":
      await promptCmd(parsed.noThinking, parsed.modelOverride);
      return;
    case "question":
      await questionCmd(parsed.noThinking, parsed.modelOverride, parsed.question);
      return;
  }
}

void run();
