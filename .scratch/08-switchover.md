# 08 — Switchover: index.ts rewrite + cleanup

**Status:** pending

## Detail

Final phase — wire everything together, remove old files, verify the full pipeline.

### Rewrite `src/index.ts`

Thin dispatch — no business logic, just parse → route → output:

```
run()
  ├── parseArgs → pattern-match Result
  │     ├── err → print formatted error + exit 1
  │     └── ok → switch on parsed.mode:
  ├── "help"     → printHelp()
  ├── "version"  → printVersion()
  ├── "connect"  → cmd/connect.connectFlow()
  ├── "no-args"  → input.readQuestion()
  │     ├── CANCEL → exit 0
  │     └── string → question.askQuestion()
  ├── "question" → question.askQuestion()
  └── for-await stream events:
        ├── "thinking" → process.stderr.write(dim(delta))  (unless hideThinking)
        └── "text"     → process.stdout.write(delta)
```

Imports from:
- `@/lib/config` (not old `@/config`)
- `@/lib/auth` (not old `@/auth`)
- `@/lib/ai` (not old `@/ai`)
- `@/lib/question`
- `@/cmd/connect`
- `@/cli`
- `@/input`
- `@/error`

### Remove old files

```
src/config.ts
src/auth.ts
src/ai.ts
src/connect.ts
src/__tests__/        (tests migrated to side-by-side in previous phases)
```

### Final verification

- `bun run typecheck` — no type errors
- `bun run lint` — no lint warnings
- `bun test` — all tests pass
- `bun run build` — produces working binary
- Manual smoke test:
  - `btw --help` shows updated usage
  - `btw --version` prints version
  - `btw connect` opens interactive setup
  - `btw "hello"` streams a response
  - `btw --no-thinking "hello"` hides thinking
  - `btw --model openai:gpt-4o-mini "test"` uses specified model
  - `btw --model invalid` prints clear error

### Acceptance criteria

- [ ] `index.ts` is under 40 lines with no business logic
- [ ] All imports point to `lib/` and `cmd/` — no old direct modules
- [ ] Old source files are deleted
- [ ] `bun test` passes
- [ ] `bun run build` succeeds
- [ ] Manual smoke test passes for all scenarios
