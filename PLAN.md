# Service-Oriented Architecture Refactor

## Rationale

The project uses a flat module pattern — all 8 source files are peers in `src/`. Core business logic (config CRUD, auth storage, AI streaming) is mixed with orchestration (`index.ts`) and interactive UI (`connect.ts`). This plan extracts core logic into a `lib/` layer and interactive flows into a `cmd/` layer, leaving `index.ts` as a thin dispatcher.

**Bugs / issues this fixes:**

- `--model` flag is parsed but silently ignored (`modelOverride` dead parameter in `ai.ts`)
- Config is read twice per request (`handleQuestion` calls both `getModelConfig()` and `readConfig()`)
- Defaults disagree between `config.ts` (`openai`) and `ai.ts` (`github-copilot`)
- No env-var fallback for API keys
- Orchestration logic in `index.ts` is hard to unit-test
- Errors are thrown as raw `Error` objects with no hierarchy or metadata

---

## Conventions

- Use `@justmiracle/result` for all fallible operations — methods return `Result<T, E>` instead of throwing
- Error classes extend `Error` directly (no shared base). Each uses an options-object constructor with `{ reason, message, cause?, meta? }`. Declare `readonly reason` and `readonly meta` as class fields.
- No try/catch in async flows — use `.then()` / `.catch()` promise chains
- Auto-bound error handlers use class property arrow functions (`private handleX = (...) => { ... }`) so call sites use `.catch(this.handleX)` without `.bind()` or inline arrows
- Small modules: single file `lib/foo.ts` with test `lib/foo.test.ts` side-by-side
- Complex modules (many error variants, constants): directory `lib/foo/index.ts`, `lib/foo/common.ts`, `lib/foo/index.test.ts`
- Command flag `--model` uses `provider:model` format, e.g. `--model openai:gpt-4o-mini`

---

## Target Directory Structure

```
src/
├── index.ts                    # Thin dispatch: parse → run → output
├── cli.ts                      # Argument parsing (revised --model format)
├── input.ts                    # Input prompt (unchanged)
├── error.ts                    # Error formatting (updated for Result)
├── lib/
│   ├── json-store.ts           # Generic JSON file read/write
│   ├── json-store.test.ts
│   ├── config.ts               # Config CRUD + validation (uses JsonStore)
│   ├── config.test.ts
│   ├── auth.ts                 # API key storage + env-var fallback (uses JsonStore)
│   ├── auth.test.ts
│   ├── ai.ts                   # AI provider wrapper (model config + streaming)
│   ├── ai.test.ts
│   ├── question.ts             # Q&A pipeline orchestration
│   └── question.test.ts
├── cmd/
│   ├── connect.ts              # btw connect interactive flow
│   ├── connect.test.ts
│   ├── model.ts                # btw model (placeholder)
│   └── init.ts                 # btw init / shell hook (placeholder)
└── __tests__/                  # Legacy test dir — migrate tests to side-by-side
```

---

## Lib Modules

### `lib/json-store.ts`

Generic JSON file persistence. Used by `config.ts` and `auth.ts`. Small module — single file.

```typescript
interface JsonStore {
  read<T>(): Promise<Result<T, JsonStoreError>>;
  write<T>(data: T): Promise<Result<void, JsonStoreError>>;
}

class JsonStoreError extends Error {
  readonly cause: "not-found" | "parse" | "permission" | "write";
  readonly meta: Record<string, unknown>;
}
```

**Responsibility:** XDG path resolution, atomic-ish JSON read/write, no business logic.

### `lib/config.ts`

Config file management. Small module — single file.

```typescript
interface ConfigSchema {
  provider: string;
  model: string;
  showThinking: boolean;
}

// Functions return Result<T, ConfigError>
readConfig(): Promise<Result<ConfigSchema | null, ConfigError>>;
writeConfig(config: ConfigSchema): Promise<Result<void, ConfigError>>;
updateConfig(partial: Partial<ConfigSchema>): Promise<Result<ConfigSchema, ConfigError>>;
configExists(): Promise<Result<boolean, ConfigError>>;
getDefaults(): ConfigSchema;
```

**Fixes:** Single `DEFAULTS` object; uses `@justmiracle/result`; no throwing.

### `lib/auth.ts`

API key management. Small module — single file.

```typescript
// Functions return Result<T, AuthError>
getApiKey(provider: string): Promise<Result<string | null, AuthError>>;
setApiKey(provider: string, apiKey: string): Promise<Result<void, AuthError>>;
```

**Env-var convention:** `<PROVIDER>_API_KEY` (uppercased, e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Checked before reading auth file.

### `lib/ai.ts`

AI provider wrapper. Small module — single file.

```typescript
interface StreamEvent {
  type: "text" | "thinking";
  delta: string;
}

interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

// Functions return Result<T, AiError>
getModelConfig(modelOverride?: string): Promise<Result<ModelConfig, AiError>>;
streamQuestion(question: string, config: ModelConfig, options?: { signal?: AbortSignal }): AsyncGenerator<StreamEvent, void, AiError>;
```

**Fixes:** `modelOverride` now works (passed through to resolve `provider:model` format). Single config read instead of double.

### `lib/question.ts`

Q&A pipeline orchestration. Small module — single file.

```typescript
interface QuestionOptions {
  noThinking: boolean;
  modelOverride?: string;
  signal?: AbortSignal;
}

// Returns Result... but also needs streaming. TBD pattern.
askQuestion(question: string, options?: QuestionOptions): AsyncGenerator<StreamEvent, void, QuestionError>;
```

**Responsibility:** Resolve config → create AbortController → wire SIGINT → stream → error boundary.

---

## Command Modules

### `cmd/connect.ts`

Moved from `connect.ts`. Pure interactive flow — calls `lib/config` and `lib/auth`.

### `cmd/model.ts` / `cmd/init.ts`

Placeholders for future commands.

---

## CLI Flag: `--model`

Changed from flat model name to `provider:model` format:

```
btw "what is 2+2" --model openai:gpt-4o-mini
btw "explain quantum" --model anthropic:claude-sonnet-4-20250514
```

`parseArgs` splits on `:` to extract provider and model. This is passed to `getModelConfig(modelOverride)` which parses `provider:model` and applies the override.

---

## Remaining Files: Fate of Each

### `src/index.ts` — Rewrite, keep location

**Role:** Entry point. Currently 83 lines handling dispatch + orchestration + output.

**Fate:** Rewrite as thin dispatcher. Q&A orchestration moves to `lib/question.ts`. `run()` becomes:

```
parseArgs → pattern-match on mode → call command/lib → write output to stdout/stderr
```

No `Result` needed for `run()` itself (top-level entry point), but the command and lib functions it calls return `Result`.

### `src/cli.ts` — Refactor, keep location

**Role:** Argument parsing. Pure function, no I/O.

**Fate:**

- `--model` format changes from `provider/model` to `provider:model`, help text updated
- `parseArgs` returns `Result<ParsedArgs, CliError>` to validate `--model` format (e.g. reject `--model openai` without a colon)
- `CliError` carries validation metadata (which arg, why)

```typescript
interface ParsedArgs {
  mode: "question" | "help" | "version" | "no-args" | "connect";
  question?: string;
  noThinking: boolean;
  modelOverride?: string; // "provider:model" format
}
```

### `src/input.ts` — Minimal changes, keep location

**Role:** Multiline input prompt. Pure UI, 22 lines.

**Fate:** Keep mostly as-is. The `CANCEL` sentinel pattern is fine for a UI module — cancellation is control flow, not an error. Could revisit replacing `CANCEL` with `Result` later if it's used in Result-aware contexts.

### `src/error.ts` — Refactor, keep location (or rename to `src/format-error.ts`)

**Role:** User-facing error message formatting. Pure function, no I/O.

**Fate:** Refactor to pattern-match on the new typed error hierarchy instead of string-matching on `err.message`:

```typescript
// Current: fragile string matching
if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) { ... }

// After: typed dispatch
if (err instanceof AuthError) {
  switch (err.reason) {
    case "invalid-key": return "Authentication failed. Check your API key is correct.";
    case "quota-exceeded": return "API quota exceeded. Check your billing plan.";
  }
}
```

Should be aware of all error classes:
| Error class | Module | Key causes |
|---|---|---|
| `JsonStoreError` | `lib/json-store.ts` | `not-found`, `parse`, `permission`, `write` |
| `ConfigError` | `lib/config.ts` | `invalid-schema`, `missing-file` |
| `AuthError` | `lib/auth.ts` | `missing-key`, `invalid-key`, `storage-failed` |
| `AiError` | `lib/ai.ts` | `api-error`, `authentication`, `quota`, `rate-limit`, `timeout`, `network`, `model-not-found` |
| `CliError` | `cli.ts` | `invalid-flag`, `missing-value` |
| `QuestionError` | `lib/question.ts` | `cancelled`, `stream-error` |

`formatError` stays pure (never returns a `Result` itself — formatting never fails).

---

## Execution Phases

The refactor is split into 8 sequential files under `.scratch/`, each with detail, acceptance criteria, and status.

| # | File | What | Status |
|---|------|------|--------|
| 01 | [`.scratch/01-foundation.md`](.scratch/01-foundation.md) | `lib/json-store.ts` + tests | completed |
| 02 | [`.scratch/02-config-service.md`](.scratch/02-config-service.md) | `lib/config.ts` + test | completed |
| 03 | [`.scratch/03-auth-service.md`](.scratch/03-auth-service.md) | `lib/auth.ts` + test | completed |
| 04 | [`.scratch/04-ai-service.md`](.scratch/04-ai-service.md) | `lib/ai.ts` + test | pending |
| 05 | [`.scratch/05-question-service.md`](.scratch/05-question-service.md) | `lib/question.ts` + test | pending |
| 06 | [`.scratch/06-commands.md`](.scratch/06-commands.md) | `cmd/connect.ts` + placeholders + tests | pending |
| 07 | [`.scratch/07-cli-and-error-refactor.md`](.scratch/07-cli-and-error-refactor.md) | `cli.ts` (`--model` + Result) + `error.ts` (typed dispatch) | pending |
| 08 | [`.scratch/08-switchover.md`](.scratch/08-switchover.md) | `index.ts` rewrite + remove old files + full verification | pending |

Each phase is additive (old files untouched) until Phase 8, where the switchover happens.

---

## Non-Goals (out of scope for this refactor)

- Implementing `btw model` or `btw init` (leave as placeholders)
- Adding a markdown renderer
- Session tracking
- Replacing the hand-rolled argument parser with yargs
- Changing the auth file location (stays in `~/.cache/btw/auth.json`)
