import { homedir } from "node:os";
import { join } from "node:path";

import pc from "picocolors";
import { ulid } from "ulid";

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

export async function shellCmd(install?: boolean): Promise<void> {
  if (install) {
    const { configPath, evalLine } = detectShellConfig();
    const content = await readFile(configPath, "utf-8").catch(() => "");

    if (content.includes(evalLine)) {
      process.stdout.write(`${pc.cyan("btw")} session init already set up in ${configPath}\n`);
      return;
    }

    const output = buildBlock(evalLine, content);

    await writeFile(configPath, output, "utf-8").catch(() => {
      process.stderr.write(`\n${pc.red("Error:")} Failed to write ${configPath}\n`);
      process.exit(1);
    });

    process.stdout.write(`${pc.green("✓")} Added "${evalLine}" to ${configPath}\n`);
    process.stdout.write(
      `   ${pc.red("→")} Run ${pc.cyan(`source ${configPath}`)} or restart your shell to activate\n`,
    );
    return;
  }

  const id = ulid();
  process.stdout.write(`export BTW_SESSION_ID=${id}\n`);
}
