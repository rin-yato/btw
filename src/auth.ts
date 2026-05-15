import { join } from "node:path";
import { homedir } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";

function getAuthDir(): string {
  const xdg = process.env.XDG_CACHE_HOME;
  if (xdg) return join(xdg, "btw");
  return join(homedir(), ".cache", "btw");
}

function authPath(): string {
  return join(getAuthDir(), "auth.json");
}

async function readAll(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(authPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const map: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string") map[k] = v;
      }
      return map;
    }
    return {};
  } catch {
    return {};
  }
}

async function writeAll(map: Record<string, string>): Promise<void> {
  const dir = getAuthDir();
  await mkdir(dir, { recursive: true });
  await writeFile(authPath(), JSON.stringify(map, null, 2) + "\n");
}

export async function getApiKey(provider: string): Promise<string | null> {
  const map = await readAll();
  return map[provider] ?? null;
}

export async function setApiKey(
  provider: string,
  apiKey: string,
): Promise<void> {
  const map = await readAll();
  map[provider] = apiKey;
  await writeAll(map);
}
