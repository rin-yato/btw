# 03 — Auth service

**Status:** pending

## Detail

Create `src/lib/auth.ts` + test alongside the existing `src/auth.ts`. Old file stays untouched.

Uses `xdgCacheStore()` from JsonStore. Adds env-var fallback — checks `<PROVIDER>_API_KEY` (uppercased, e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) before reading auth file.

### Interface

```typescript
getApiKey(provider: string): Promise<Result<string | null, AuthError>>;
setApiKey(provider: string, key: string): Promise<Result<void, AuthError>>;
```

- `getApiKey` checks `process.env[<PROVIDER>_API_KEY]` first, then falls back to auth file
- `setApiKey` writes to auth file only (does not set env var)

### Acceptance criteria

- [ ] All functions return `Result<T, AuthError>` — no thrown exceptions
- [ ] `getApiKey("openai")` returns env var `OPENAI_API_KEY` when set
- [ ] `getApiKey("openai")` falls back to auth file when env var is not set
- [ ] Returns `ok(null)` when no key found anywhere (not an error)
- [ ] Old `src/auth.ts` still works, old tests still pass
- [ ] New `src/lib/auth.test.ts` covers: env-var path, file path, missing key, set key
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
