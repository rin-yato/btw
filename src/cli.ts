import { err, isErr, ok, type Result } from "@justmiracle/result";

import packageJson from "../package.json";

////////////////////////////////////////////////////////////////////////////////////
const REASON_MESSAGES = {
  "invalid-flag": "Invalid flag value",
  "missing-value": "Flag requires a value",
} as const;

type CliErrorReason = keyof typeof REASON_MESSAGES;

export class CliError extends Error {
  declare readonly reason: CliErrorReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: CliErrorReason;
    message: string;
    cause?: unknown;
    meta?: Record<string, unknown>;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = this.constructor.name;
    this.reason = opts.reason;
    this.meta = opts.meta ?? {};
  }
}
////////////////////////////////////////////////////////////////////////////////////

export type ParsedArgs =
  | { mode: "help" }
  | { mode: "version" }
  | { mode: "connect" }
  | { mode: "no-args"; noThinking: boolean; modelOverride?: string }
  | { mode: "question"; question: string; noThinking: boolean; modelOverride?: string };

////////////////////////////////////////////////////////////////////////////////////

interface ModelFlag {
  value: string;
  index: number;
}

function parseModelFlag(args: string[]): Result<ModelFlag | undefined, CliError> {
  const idx = args.indexOf("--model");
  if (idx === -1) return ok(undefined);

  const value = args[idx + 1];

  if (value === undefined) {
    return err(
      new CliError({
        reason: "missing-value",
        message: "--model requires a value in provider:model format",
      }),
    );
  }

  if (!value.includes(":")) {
    return err(
      new CliError({
        reason: "invalid-flag",
        message: `--model value "${value}" must be in provider:model format (e.g. openai:gpt-4o-mini)`,
        meta: { value },
      }),
    );
  }

  return ok({ value, index: idx });
}

function buildPositional(args: string[], modelFlag: ModelFlag | undefined): string[] {
  return args.filter((a, i) => {
    if (a === "--no-thinking") return false;
    if (modelFlag && (i === modelFlag.index || i === modelFlag.index + 1)) return false;
    return true;
  });
}
////////////////////////////////////////////////////////////////////////////////////

export function parseArgs(argv: string[]): Result<ParsedArgs, CliError> {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) return ok({ mode: "help" });
  if (args.includes("--version") || args.includes("-v")) return ok({ mode: "version" });

  const noThinking = args.includes("--no-thinking");

  const modelResult = parseModelFlag(args);
  if (isErr(modelResult)) return modelResult;

  const positional = buildPositional(args, modelResult.value);

  if (positional[0] === "connect") return ok({ mode: "connect" });

  if (positional.length > 0) {
    return ok({
      mode: "question",
      question: positional.join(" "),
      noThinking,
      modelOverride: modelResult.value?.value,
    });
  }

  return ok({ mode: "no-args", noThinking, modelOverride: modelResult.value?.value });
}

export function printHelp(): void {
  console.log(`btw — AI answers in your terminal

Usage:
  btw <question>          Ask a question
  btw                     Open multiline input
  btw connect             Set up AI provider and API key
  btw --help              Show this message
  btw --version           Print version

Options:
  --no-thinking           Hide thinking/reasoning output
  --model <provider:model>  Override model for this query`);
}

export function printVersion(): void {
  console.log(`v${packageJson.version}`);
}
