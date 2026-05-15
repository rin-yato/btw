# 03 — Auth service

**Status:** done

## Detail

Create `src/lib/auth.ts` + test alongside the existing `src/auth.ts`. Old file stays untouched.

Uses `JsonStore` (from Phase 1) for file I/O. Auth data is a simple `Record<string, string>` mapping provider → API key (e.g. `{ "openai": "sk-...", "anthropic": "sk-ant-..." }`).

No env-var fallback — keys are read from the auth file only.

### Patterns (follow lib/config.ts)

- **Class with constructor DI**: `AuthService` takes a `JsonStore` instance
- **async/await with early return**: no `.then()` chains
- **Store errors bubble up**: methods return `Result<T, JsonStoreError>` — no wrapping in `AuthError`
- **No `AuthError`**: auth-specific domain errors don't exist for this module. Missing keys are `ok(null)`, not errors. Store failures are `JsonStoreError`.
- **Side-by-side test**: `src/lib/auth.test.ts` with temp dir

### Interface

```typescript
getApiKey(provider: string): Promise<Result<string | null, JsonStoreError>>;
setApiKey(provider: string, key: string): Promise<Result<void, JsonStoreError>>;
```



### Flow

#### getApiKey
1. `store.read()` → get `Record<string, string>` → `ok(map[provider])` or `ok(null)`
2. Store fails with `not-found` → `ok(null)` (first run, no auth file yet)
3. Store fails with other → `JsonStoreError` bubbles up

#### setApiKey
1. Read existing auth data via `store.read()`
2. If store fails with `not-found` → start with empty `{}`
3. If store fails with other → `JsonStoreError` bubbles up
4. Merge `{ [provider]: key }` into map
5. `store.write(merged)` → write fails → `JsonStoreError` bubbles up

### Acceptance criteria

- [ ] Returns `ok(null)` when no key found (not an error)
- [ ] `setApiKey("openai", "sk-...")` persists to auth file and can be read back
- [ ] `setApiKey` overwrites existing key for the same provider
- [ ] Store errors (`JsonStoreError`) bubble up — no wrapping in `AuthError`
- [ ] Old `src/auth.ts` still works, old tests still pass
- [ ] New `src/lib/auth.test.ts` covers: env-var path, file path, missing key, set key, write failure
- [ ] `bun test` passes
