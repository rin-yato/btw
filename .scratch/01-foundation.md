# 01 — Foundation: json-store

**Status:** completed

## Detail

Set up the generic JSON file persistence module.

1. Install `@justmiracle/result`
2. Create `src/lib/json-store.ts` + test

### Pattern

Error classes extend `Error` directly (no shared base class). Each uses:

- `declare readonly reason` — typed literal union identifying the error category
- `declare readonly meta: Record<string, unknown>` — additional context
- Options-object constructor with `{ reason, message, cause?, meta? }`
- `cause` is passed to `super(message, { cause })` for JS error cause chaining

### JsonStore (`src/lib/json-store.ts`)

```typescript
interface JsonStoreOptions {
  dir: string;
  filename: string;
}

class JsonStore {
  constructor(private opts: JsonStoreOptions);

  read(): Promise<Result<unknown, JsonStoreError>>;
  write<T>(data: T): Promise<Result<void, JsonStoreError>>;
  exists(): boolean;
}
```

- `read()` chains `readFile → JSON.parse → ok → catch(toJsonStoreError)`
- `write()` chains `mkdir → writeFile → ok → catch(toJsonStoreError)`
- Error handlers are class property arrow functions (auto-bound, no `.bind()` or inline arrows at call site)

### Acceptance criteria

- [x] `bun add @justmiracle/result` succeeds
- [x] `JsonStoreError` extends `Error` with options-object constructor (`reason`, `message`, `cause`, `meta`)
- [x] `JsonStore.read()` returns `Result<unknown, JsonStoreError>` — `ok(data)` on success, `err(JsonStoreError)` on file-not-found, parse errors, etc.
- [x] `JsonStore.write<T>()` returns `Result<void, JsonStoreError>`
- [x] `bun test` passes (new tests + all existing tests)
