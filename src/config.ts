import { join } from "node:path";
import { homedir } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface ConfigSchema {
  provider: string;
  model: string;
  showThinking: boolean;
}

const DEFAULTS: ConfigSchema = {
  provider: "openai",
  model: "gpt-4o-mini",
  showThinking: true,
};

export function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "btw");
  return join(homedir(), ".config", "btw");
}

function configPath(): string {
  return join(getConfigDir(), "config.json");
}

export async function readConfig(): Promise<ConfigSchema | null> {
  try {
    const raw = await readFile(configPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return validateConfig(parsed);
  } catch {
    return null;
  }
}

export async function writeConfig(config: ConfigSchema): Promise<void> {
  const dir = getConfigDir();
  await mkdir(dir, { recursive: true });
  await writeFile(configPath(), JSON.stringify(config, null, 2) + "\n");
}

export async function updateConfig(
  partial: Partial<ConfigSchema>,
): Promise<ConfigSchema> {
  const existing = (await readConfig()) ?? DEFAULTS;
  const merged = { ...existing, ...partial };
  await writeConfig(merged);
  return merged;
}

function validateConfig(raw: Record<string, unknown>): ConfigSchema {
  return {
    provider:
      typeof raw.provider === "string" ? raw.provider : DEFAULTS.provider,
    model: typeof raw.model === "string" ? raw.model : DEFAULTS.model,
    showThinking:
      typeof raw.showThinking === "boolean"
        ? raw.showThinking
        : DEFAULTS.showThinking,
  };
}

export async function configExists(): Promise<boolean> {
  return existsSync(configPath());
}
