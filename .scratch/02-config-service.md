# 02 — Config service

**Status:** pending

## Detail

Create `src/lib/config.ts` + test alongside the existing `src/config.ts`. Old file stays untouched.

Uses `JsonStore` (from Phase 1) for file I/O. Single `DEFAULTS` object — eliminates the current disagreement between `config.ts` defaults and `ai.ts` defaults.

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
- `getDefaults` is a pure function returning `{ provider: "openai", model: "gpt-4o-mini", showThinking: true }`

### Acceptance criteria

- [ ] All functions return `Result<T, ConfigError>` — no thrown exceptions
- [ ] `getDefaults()` is the single source of truth (removes default disagreement bug)
- [ ] Old `src/config.ts` still works, old tests still pass
- [ ] New `src/lib/config.test.ts` covers: read existing, read missing, write, update merge, defaults
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
