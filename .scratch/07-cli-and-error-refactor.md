# 07 — CLI and error refactor

**Status:** pending

## Detail

Two independent changes — listed together because both are in-place modifications to existing files.

### `src/cli.ts` — `--model` format + Result return

- `--model` flag changes from `--model <model-id>` to `--model <provider:model>` (colon separator)
- `parseArgs` returns `Result<ParsedArgs, CliError>` for validation
- Validates that when `--model` is present, the value contains a `:`

```typescript
export type CliReason = "invalid-flag" | "missing-value";

export class CliError extends Error {
  declare readonly reason: CliReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: CliReason;
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
```

```typescript
interface ParsedArgs {
  mode: "question" | "help" | "version" | "no-args" | "connect";
  question?: string;
  noThinking: boolean;
  modelOverride?: string;  // "provider:model" format, e.g. "openai:gpt-4o-mini"
}

parseArgs(argv: string[]): Result<ParsedArgs, CliError>;
```

- `printHelp()` updated: `--model <provider:model>` in usage text

### `src/error.ts` — Typed error dispatch

Replace fragile string-matching with instanceof checks on the typed error hierarchy:

```typescript
formatError(err: unknown): string;
```

Before: `if (msg.includes("401") || msg.toLowerCase().includes("unauthorized"))`
After: `if (err instanceof AiError && err.reason === "authentication")`

Dispatch order:
1. `JsonStoreError` → file-level messages
2. `ConfigError` → config-specific messages
3. `AuthError` → key-specific messages
4. `AiError` → API/messages (maps to current auth/quota/rate-limit/network/timeout/model-not-found branches)
5. `CliError` → flag usage messages
6. `QuestionError` → pipeline messages
7. Fallback: `err.message` or `String(err)`

### Acceptance criteria

- [ ] `parseArgs` returns `Result<ParsedArgs, CliError>` — no thrown exceptions
- [ ] `--model openai:gpt-4o-mini` parses to `modelOverride: "openai:gpt-4o-mini"`
- [ ] `--model` without value returns `err(CliError)` with reason `"missing-value"`
- [ ] `--model openai` (no colon) returns `err(CliError)` with reason `"invalid-flag"`
- [ ] Help text shows `--model <provider:model>`
- [ ] `formatError(err instanceof AiError)` returns correct user-friendly message based on reason
- [ ] `formatError(unknown error)` falls back to `String(err)`
- [ ] `bun test` passes
