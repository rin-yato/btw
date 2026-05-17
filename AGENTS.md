# btw

CLI tool for asking AI questions in the terminal.

## Commands

- `bun run dev` — Run the CLI
- `bun run build` — Build to `dist/`
- `bun test` — Run tests
- `bun run check:fix` — Lint, auto fmt, organize imports
- `bun run typecheck` — `tsc --noEmit`
- `bun run ci` — Full pipeline: `check` → `typecheck` → `test` → `build`

## Architecture

```
src/
├── index.ts     # Dispatch — parse CLI args, route to command
├── cli.ts       # Arg parsing → ParsedArgs
├── cmd/         # Command handlers (*Cmd functions)
└── lib/         # Services (config, auth, AI, models, persistence)
```

`cmd/` modules each export a single async `*Cmd()` that handles one command (question, connect, model, init). `lib/` contains service classes and utilities consumed by cmd handlers.

## Domain language

See [CONTEXT.md](./CONTEXT.md) for the project glossary. Key terms:

- **Question** / **Answer** / **Thinking**
- **Model** / **Model Override** / **Provider**
- **Credential** / **Connect**
- **Inline Mode** / **Interactive Mode**

## Principles

- Make the smallest correct change
- Preserve existing architecture and patterns
- Avoid unrelated refactors
- Prefer clarity over cleverness
- Prefer composition over complexity

## Before coding

- Read relevant files fully
- Search for existing patterns before introducing new ones
- Understand how the feature/module currently works
- Verify assumptions before editing

## TypeScript

- Keep strict type safety
- Avoid `any` unless absolutely necessary
- Avoid unsafe casts and non-null assertions
- Keep public APIs minimal and intentional

## Conventions

- **Result types**: All fallible operations return `Result<T, E>` from `@justmiracle/result`. No throwing exceptions for expected failures.
- **Error classes**: Extend `Error` directly. Constructor takes options object: `{ reason, message, cause?, meta? }`. Reasons are typed constants (`type XReason = keyof typeof REASON_MESSAGES`). Error handlers are auto-bound arrow properties.
- **Validation**: Use Valibot schemas for any data that crosses a boundary (files, user input, API responses).
- **Tests**: Side-by-side test files: `lib/foo.ts` + `lib/foo.test.ts`. Bun test runner.
- **Arg parsing**: Custom parser in `cli.ts` (no yargs/minimist). Returns `Result<ParsedArgs, CliError>`.
- **CLI structure**: Each `cmd/*.ts` module exports a single async `*Cmd()` function. Error handling is done in the command handler (log + exit), not propagated up.

## Editing rules

- Change only what is necessary
- Avoid unnecessary renames or file moves
- Do not touch generated files (dist/)
- Keep diffs focused and reviewable
- Reuse existing utilities and abstractions when possible

## Validation

After making changes:
- run `bun run check:fix` for lint
- run `bun run typecheck`
- run `bun test` if tests exist for changed files
- verify imports and exports
- re-read modified code for correctness

Never claim success without verification.

## Communication

When summarizing work:
- explain what changed
- explain why
- mention limitations or unverified areas

Be concise and factual.

## Safety

Never:
- expose secrets or credentials
- run destructive commands without approval
- overwrite user data unexpectedly
- introduce large dependencies without justification
