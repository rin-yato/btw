# 01 — Foundation: errors + json-store

**Status:** pending

## Detail

Set up the shared foundation that every other module depends on.

1. Install `@justmiracle/result`
2. Create `src/lib/errors.ts` with typed error hierarchy
3. Create `src/lib/json-store.ts` — generic JSON file persistence using Result
4. Side-by-side test: `src/lib/json-store.test.ts`

### Error hierarchy (`src/lib/errors.ts`)

```
BtwError (base)
├── JsonStoreError   (cause: "not-found" | "parse" | "permission" | "write")
├── ConfigError      (cause: "invalid-schema" | "missing-file")
├── AuthError        (cause: "missing-key" | "storage-failed")
├── AiError          (cause: "api-error" | "authentication" | "quota" | "rate-limit" | "timeout" | "network" | "model-not-found")
├── CliError         (cause: "invalid-flag" | "missing-value")
└── QuestionError    (cause: "cancelled" | "stream-error")
```

Each class accepts a `cause` literal and an optional `meta: Record<string, unknown>`.

### JsonStore (`src/lib/json-store.ts`)

```typescript
interface JsonStoreOptions {
  dir: string;
  filename: string;
}

class JsonStore {
  constructor(private opts: JsonStoreOptions);

  read<T>(): Promise<Result<T, JsonStoreError>>;
  write<T>(data: T): Promise<Result<void, JsonStoreError>>;
}

// Factory helpers using XDG conventions
xdgConfigStore(): JsonStore;    // $XDG_CONFIG_HOME/btw/ or ~/.config/btw/
xdgCacheStore(): JsonStore;     // $XDG_CACHE_HOME/btw/ or ~/.cache/btw/
```

Interface-first: sketch the interface, then implement.

## Acceptance criteria

- [ ] `bun add @justmiracle/result` succeeds
- [ ] `BtwError` base class exists with `.cause` and `.meta` properties
- [ ] All concrete error classes extend `BtwError` with correct cause literals
- [ ] `JsonStore.read<T>()` returns `Result<T, JsonStoreError>` — `ok(data)` on success, `err(JsonStoreError)` on file-not-found, parse errors, etc.
- [ ] `JsonStore.write<T>()` returns `Result<void, JsonStoreError>`
- [ ] `xdgConfigStore()` and `xdgCacheStore()` resolve correct XDG paths
- [ ] `bun test` passes (new tests + all existing tests still pass)
- [ ] `bun run typecheck` passes
