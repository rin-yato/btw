import { homedir } from "node:os";
import { join } from "node:path";

import { ConfigService } from "@/lib/config";

import { isErr } from "@justmiracle/result";
import pc from "picocolors";

import { readFile, writeFile } from "node:fs/promises";

function detectShellConfig(): { configPath: string; evalLine: string } {
  const shell = process.env.SHELL ?? "";
  const home = homedir();

  if (shell.includes("fish")) {
    return {
      configPath: join(home, ".config", "fish", "config.fish"),
      evalLine: "eval (btw shell)",
    };
  }

  if (shell.includes("bash")) {
    return { configPath: join(home, ".bashrc"), evalLine: "eval $(btw shell)" };
  }

  return { configPath: join(home, ".zshrc"), evalLine: "eval $(btw shell)" };
}

const COMMENT = "# btw — start session on shell launch";

function buildBlock(evalLine: string, existing: string): string {
  const sep = existing ? (existing.endsWith("\n") ? "\n" : "\n\n") : "\n";
  return `${existing}${sep}${COMMENT}\n${evalLine}\n`;
}

async function installShellEval(): Promise<void> {
  const { configPath, evalLine } = detectShellConfig();
  const content = await readFile(configPath, "utf-8").catch(() => "");

  if (content.includes(evalLine)) return;

  const output = buildBlock(evalLine, content);

  await writeFile(configPath, output, "utf-8").catch(() => {
    process.stderr.write(`\n${pc.red("Error:")} Failed to write ${configPath}\n`);
    process.exit(1);
  });

  process.stdout.write(`   ${pc.dim("Added to")} ${configPath}\n`);
  process.stdout.write(
    `   ${pc.red("→")} Run ${pc.cyan(`source ${configPath}`)} or restart your shell\n`,
  );
}

export async function sessionCmd(action: "global" | "per-terminal"): Promise<void> {
  const configService = new ConfigService();

  if (action === "global") {
    const result = await configService.updateConfig({ session: "global" });
    if (isErr(result)) {
      process.stderr.write(`\n${pc.red("Error:")} ${result.error.message}\n`);
      process.exit(1);
    }
    process.stdout.write(`${pc.green("✓")} Session mode set to ${pc.bold("global")}\n`);
    process.stdout.write(
      `   ${pc.dim("btw will use a shared global session across all terminals.")}\n`,
    );
    return;
  }

  if (action === "per-terminal") {
    const result = await configService.updateConfig({ session: "per-terminal" });
    if (isErr(result)) {
      process.stderr.write(`\n${pc.red("Error:")} ${result.error.message}\n`);
      process.exit(1);
    }
    process.stdout.write(`${pc.green("✓")} Session mode set to ${pc.bold("per-terminal")}\n`);
    await installShellEval();
    return;
  }
}
