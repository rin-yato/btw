# 07 — CLI and error refactor

**Status:** pending

## Detail

Two independent changes — listed together because both are in-place modifications to existing files.

### `src/cli.ts` — `--model` format + Result return

- `--model` flag changes from `--model <model-id>` to `--model <provider:model>` (colon separator)
- `parseArgs` returns `Result<ParsedArgs, CliError>` for validation
- Validates that when `--model` is present, the value contains a `:`
- `parseArgs` signature changes from synchronous to wrapped in Result

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
After: `if (err instanceof AiError && err.cause === "authentication")`

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
- [ ] `--model` without value returns `err(CliError)` with cause `"missing-value"`
- [ ] `--model openai` (no colon) returns `err(CliError)` with cause `"invalid-flag"`
- [ ] Help text shows `--model <provider:model>`
- [ ] `formatError(certain AiError)` returns correct user-friendly message based on cause
- [ ] `formatError(unknown error)` falls back to `String(err)`
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
