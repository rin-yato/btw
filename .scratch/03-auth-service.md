# 03 — Auth service

**Status:** pending

## Detail

Create `src/lib/auth.ts` + test alongside the existing `src/auth.ts`. Old file stays untouched.

Uses `JsonStore` (from Phase 1) for file I/O. Adds env-var fallback — checks `<PROVIDER>_API_KEY` (uppercased, e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) before reading auth file.

### Error pattern (follow json-store.ts)

```typescript
export type AuthReason = "missing-key" | "storage-failed";

export class AuthError extends Error {
  declare readonly reason: AuthReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: AuthReason;
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
