import { homedir } from "node:os";
import { join } from "node:path";

import type { JsonStore, JsonStoreError } from "@/lib/json-store";
import { ModelStringSchema } from "@/lib/model";
import { mergeObjects } from "@/lib/utils";

import { err, isErr, ok, type Result } from "@justmiracle/result";
import * as v from "valibot";

const ConfigValidator = v.object({
  model: v.optional(ModelStringSchema),
  showThinking: v.boolean(),
});

export type ConfigSchema = v.InferOutput<typeof ConfigValidator>;

////////////////////////////////////////////////////////////////////////////////

const REASON_MESSAGES = {
  "invalid-schema": "Configuration error: Config file has invalid data",
} as const;

type ConfigErrorReason = keyof typeof REASON_MESSAGES;

export class ConfigError extends Error {
  declare readonly reason: ConfigErrorReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: ConfigErrorReason;
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

////////////////////////////////////////////////////////////////////////////////

const DEFAULTS: ConfigSchema = {
  showThinking: true,
};

export function getDefaults(): ConfigSchema {
  return { ...DEFAULTS };
}

export const CONFIG_FILENAME = "config.json";

export function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "btw");
  return join(homedir(), ".config", "btw");
}

export function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILENAME);
}

export class ConfigService {
  constructor(private store: JsonStore) {}

  async readConfig(): Promise<Result<ConfigSchema, ConfigError | JsonStoreError>> {
    const result = await this.store.read();

    if (isErr(result)) {
      if (result.error.reason === "not-found") return ok(getDefaults());
      return result;
    }

    const parsed = v.safeParse(ConfigValidator, result.value);
    if (!parsed.success) {
      return err(
        new ConfigError({
          reason: "invalid-schema",
          message: REASON_MESSAGES["invalid-schema"],
          meta: { issues: parsed.issues },
        }),
      );
    }

    return ok(parsed.output);
  }

  async writeConfig(c: ConfigSchema): Promise<Result<void, ConfigError | JsonStoreError>> {
    const validated = v.safeParse(ConfigValidator, c);
    if (!validated.success) {
      return err(
        new ConfigError({
          reason: "invalid-schema",
          message: REASON_MESSAGES["invalid-schema"],
          meta: { issues: validated.issues },
        }),
      );
    }

    const result = await this.store.write(validated.output);
    if (isErr(result)) return result;
    return ok(undefined);
  }

  async updateConfig(
    partial: Partial<ConfigSchema>,
  ): Promise<Result<ConfigSchema, ConfigError | JsonStoreError>> {
    const existingResult = await this.readConfig();
    if (isErr(existingResult)) return existingResult;

    const merged = mergeObjects<ConfigSchema>(getDefaults(), existingResult.value, partial);
    const writeResult = await this.writeConfig(merged);
    if (isErr(writeResult)) return writeResult;

    return ok(merged);
  }

  configExists(): Result<boolean, ConfigError> {
    return ok(this.store.exists());
  }
}
