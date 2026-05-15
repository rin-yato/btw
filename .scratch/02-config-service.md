# 02 — Config service

**Status:** done

## Detail

Create `src/lib/config.ts` + test alongside the existing `src/config.ts`. Old file stays untouched.

Uses `JsonStore` (from Phase 1) for file I/O. Single `DEFAULTS` object — eliminates the current disagreement between `config.ts` defaults and `ai.ts` defaults.

### Error pattern (follow json-store.ts)

```typescript
export type ConfigReason = "invalid-schema" | "missing-file";

export class ConfigError extends Error {
  declare readonly reason: ConfigReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: ConfigReason;
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

### Interface

```typescript
interface ConfigSchema {
  provider: string;
  model: string;
  showThinking: boolean;
}

readConfig(): Promise<Result<ConfigSchema | null, ConfigError>>;
writeConfig(c: ConfigSchema): Promise<Result<void, ConfigError>>;
updateConfig(p: Partial<ConfigSchema>): Promise<Result<ConfigSchema, ConfigError>>;
configExists(): Promise<Result<boolean, ConfigError>>;
getDefaults(): ConfigSchema;
```

- `readConfig` returns `ok(null)` when no config file exists (first-run state)
- `updateConfig` merges partial into current (or defaults) and writes
- `getDefaults` is pure: `{ provider: "openai", model: "gpt-4o-mini", showThinking: true }`

### Acceptance criteria

- [x] All functions return `Result<T, ConfigError>` — no thrown exceptions
- [x] `getDefaults()` is the single source of truth (removes default disagreement bug)
- [x] Old `src/config.ts` still works, old tests still pass
- [x] New `src/lib/config.test.ts` covers: read existing, read missing, write, update merge, defaults
- [x] `bun test` passes
