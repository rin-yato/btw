export interface ParsedArgs {
  mode: "question" | "help" | "version" | "no-args";
  question?: string;
  noThinking: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    return { mode: "help", noThinking: false };
  }

  if (args.includes("--version") || args.includes("-v")) {
    return { mode: "version", noThinking: false };
  }

  const noThinking = args.includes("--no-thinking");

  const positionalArgs = args.filter((a) => !a.startsWith("-"));

  if (positionalArgs.length > 0) {
    return { mode: "question", question: positionalArgs.join(" "), noThinking };
  }

  return { mode: "no-args", noThinking };
}

export function printHelp(): void {
  console.log(`btw — AI answers in your terminal

Usage:
  btw <question>          Ask a question
  btw                     Open multiline input
  btw --help              Show this message
  btw --version           Print version

Options:
  --no-thinking           Hide thinking/reasoning output
  --model <provider/model>  Override model for this query`);
}

export function printVersion(): void {
  console.log("btw 0.1.0");
}
