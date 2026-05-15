# btw

CLI tool for asking AI questions in the terminal. Three entrypoints: `btw`, `qq`, `q`.

## Stack

Bun + TypeScript 6.0. Biome for lint/format. `@clack/prompts` for interactive UI. `@earendil-works/pi-ai` for AI streaming. `picocolors` for terminal color.

## Commands

- `bun src/index.ts` / `bun run dev` / `bun run btw`  Run the CLI 
- `bun run build`  Minified node build to `dist/` 
- `bun test`  Run all tests (Bun test runner) 
- `bun run check`  Biome lint 
- `bun run check:fix`  Biome lint + auto-fix 
- `bun run typecheck`  `tsc --noEmit` 
- `bun run ci`  Full pipeline: `check` → `typecheck` → `test` → `build` 

## Imports

`@/*` maps to `src/*` (configured in tsconfig paths + Biome organize imports groups).

## Conventions

- **Result types**: Use `@justmiracle/result` for all fallible operations. Return `Result<T, E>` — no throwing.
- **Error classes**: Extend `Error` directly (no shared base). Options-object constructor: `{ reason, message, cause?, meta? }`. Auto-bound arrow function properties for error handlers.
- **Side-by-side tests**: `lib/foo.ts` + `lib/foo.test.ts`.

