# 06 — Commands

**Status:** pending

## Detail

Create `src/cmd/` directory with connect command and placeholders for future commands.

### `src/cmd/connect.ts` + test

Extracted from `src/connect.ts`. Uses `lib/config` and `lib/auth` (Result-based) instead of directly importing old modules.

```typescript
connectFlow(): Promise<Result<void, ConnectError>>;
```

Interactive flow:
1. `intro()` from clack
2. `select()` provider from `getProviders()` (pi-ai)
3. `password()` for API key
4. `updateConfig({ provider })` from `lib/config`
5. `setApiKey(provider, key)` from `lib/auth`
6. `outro()` with confirmation

### `src/cmd/model.ts` — placeholder

```typescript
export async function modelFlow(): Promise<Result<void, never>> {
  console.log("Not yet implemented");
  return ok(undefined);
}
```

### `src/cmd/init.ts` — placeholder

```typescript
export async function initFlow(): Promise<Result<void, never>> {
  console.log("Not yet implemented");
  return ok(undefined);
}
```

### Acceptance criteria

- [ ] `cmd/connect.ts` calls `lib/config` and `lib/auth` (Result-based APIs)
- [ ] Cancel actions exit cleanly with `process.exit(0)`
- [ ] Old `src/connect.ts` still works, old tests still pass
- [ ] `cmd/model.ts` and `cmd/init.ts` export valid functions returning `Result<void, never>`
- [ ] `bun test` passes
