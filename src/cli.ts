export interface ParsedArgs {
  mode: "question" | "help" | "version" | "no-args" | "connect";
  question?: string;
  noThinking: boolean;
  modelOverride?: string;
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

  const modelIndex = args.indexOf("--model");
  const modelOverride =
    modelIndex !== -1 && modelIndex + 1 < args.length ? args[modelIndex + 1] : undefined;

  const skipFlags = new Set(["--no-thinking", "--model"]);
  const positional = args.filter((a, i) => {
    if (skipFlags.has(a)) return false;
    if (a === "--model") return false;
    const mi = args.indexOf("--model");
    if (mi !== -1 && i === mi + 1) return false;
    return true;
  });

  if (positional[0] === "connect") {
    return { mode: "connect", noThinking, modelOverride };
  }

  if (positional.length > 0) {
    return {
      mode: "question",
      question: positional.join(" "),
      noThinking,
      modelOverride,
    };
  }

  return { mode: "no-args", noThinking, modelOverride };
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
  --model <provider/model>  Override model for this query`);
}

export function printVersion(): void {
  console.log("btw 0.1.0");
}
