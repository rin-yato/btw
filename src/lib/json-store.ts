import { existsSync } from "node:fs";
import { join } from "node:path";

import { type Err, err, ok, type Result } from "@justmiracle/result";

import { mkdir, readFile, writeFile } from "node:fs/promises";

const REASON_MESSAGES = {
  "not-found": "Configuration file error: File not found",
  parse: "Configuration file error: Failed to parse JSON",
  permission: "Configuration file error: Permission denied",
  write: "Configuration file error: Failed to write file",
  read: "Configuration file error: Failed to read file",
} as const;

type JsonStoreErrorReason = keyof typeof REASON_MESSAGES;

export class JsonStoreError extends Error {
  declare readonly reason: JsonStoreErrorReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: JsonStoreErrorReason;
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

export interface JsonStoreOptions {
  dir: string;
  filename: string;
}

export class JsonStore {
  constructor(private opts: JsonStoreOptions) {}

  async read(): Promise<Result<unknown, JsonStoreError>> {
    return readFile(this.path(), "utf-8")
      .then(JSON.parse)
      .then(ok)
      .catch(this.toJsonStoreError);
  }

  async write<T>(data: T): Promise<Result<void, JsonStoreError>> {
    return mkdir(this.opts.dir, { recursive: true })
      .then(() => writeFile(this.path(), `${JSON.stringify(data, null, 2)}\n`))
      .then(ok)
      .catch(this.toJsonStoreError);
  }

  exists(): boolean {
    return existsSync(this.path());
  }

  private path(): string {
    return join(this.opts.dir, this.opts.filename);
  }

  private toJsonStoreError = (error: unknown): Err<JsonStoreError> => {
    const reason = this.inferReason(error);
    return err(
      new JsonStoreError({
        reason,
        message: REASON_MESSAGES[reason],
        cause: error,
      }),
    );
  };

  private inferReason(error: unknown): JsonStoreErrorReason {
    if (error instanceof SyntaxError) return "parse";
    if (this.isNodeError(error, "ENOENT")) return "not-found";
    if (this.isNodeError(error, "EACCES") || this.isNodeError(error, "EPERM"))
      return "permission";
    if (this.isNodeError(error, "EISDIR")) return "write";
    return "read";
  }

  private isNodeError(error: unknown, code: string): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as Record<string, unknown>).code === code
    );
  }
}
