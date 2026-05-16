#!/usr/bin/env node

import { isErr } from "@justmiracle/result";
import pc from "picocolors";

import { parseArgs, printHelp, printVersion } from "@/cli";
import { connectCmd } from "@/cmd/connect";
import { modelCmd } from "@/cmd/model";
import { promptCmd, questionCmd } from "@/cmd/question";

async function run(): Promise<void> {
  const parsedResult = parseArgs(process.argv);

  if (isErr(parsedResult)) {
    process.stderr.write(`\n${pc.red("Error:")} ${parsedResult.error.message}\n`);
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
    case "connect":
      await connectCmd();
      return;
    case "model":
      await modelCmd();
      return;
    case "no-args":
      await promptCmd(parsed.noThinking, parsed.modelOverride);
      return;
    case "question":
      await questionCmd(parsed.noThinking, parsed.modelOverride, parsed.question);
      return;
  }
}

await run().catch((e) => {
  process.stderr.write(`\n${pc.red("Unexpected error:")} ${String(e)}\n`);
  process.exit(1);
});
