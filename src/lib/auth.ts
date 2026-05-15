import { homedir } from "node:os";
import { join } from "node:path";

import type { JsonStore, JsonStoreError } from "@/lib/json-store";
import { mergeObjects } from "@/lib/utils";

import { isErr, ok, type Result } from "@justmiracle/result";
import * as v from "valibot";

const AuthMapSchema = v.record(v.string(), v.string());

export function getAuthDir(): string {
  const xdg = process.env.XDG_CACHE_HOME;
  if (xdg) return join(xdg, "btw");
  return join(homedir(), ".cache", "btw");
}

export function getAuthPath(): string {
  return join(getAuthDir(), "auth.json");
}

export class AuthService {
  constructor(private store: JsonStore) {}

  async getApiKey(provider: string): Promise<Result<string | null, JsonStoreError>> {
    const result = await this.store.read();

    if (isErr(result)) {
      if (result.error.reason === "not-found") return ok(null);
      return result;
    }

    const map = parseAuthMap(result.value);
    return ok(map[provider] ?? null);
  }

  async setApiKey(provider: string, key: string): Promise<Result<void, JsonStoreError>> {
    const result = await this.store.read();

    if (isErr(result) && result.error.reason !== "not-found") return result;

    const map = isErr(result) ? {} : parseAuthMap(result.value);
    return this.store.write(mergeObjects<Record<string, string>>(map, { [provider]: key }));
  }
}

function parseAuthMap(value: unknown): Record<string, string> {
  const parsed = v.safeParse(AuthMapSchema, value);
  return parsed.success ? parsed.output : {};
}
