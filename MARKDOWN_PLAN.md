# Markdown Rendering Plan

## Tech

- **`marked`** — markdown parser (turns raw text into a token tree)
- **picocolors** — already a dependency; ANSI escape codes for bold, dim, italic, etc.
- **No new runtime dependencies**

## Features (V1)

| Feature | Status |
|---|---|
| `**bold**` | Yes |
| `*italic*` | Yes |
| `` `inline code` `` | Yes |
| ` ``` ` code blocks | Yes |
| `[links](url)` | Yes (OSC 8 terminal hyperlinks where supported) |
| Headings, lists, blockquotes, tables, HRs | Deferred |
| Syntax highlighting | Deferred |

## Architecture

### New file: `src/lib/markdown.ts`

Exports a `MarkdownRenderer` class that encapsulates all rendering state:

```
MarkdownRenderer
├── constructor(stream?: NodeJS.WriteStream)
├── write(delta: string): void      ← feed raw text deltas
└── end(): void                     ← flush, write trailing newline
```

**Behavior:**
- **TTY mode** (auto-detected via `stream.isTTY`): accumulates deltas into a buffer, queues a microtask to re-parse the full buffer with `marked`, computes ANSI output via a custom token walker, moves cursor up to overwrite previous output.
- **Non-TTY / pipe mode**: pass-through — writes raw `delta` directly to stream. No ANSI, no cursor codes.
- **Throttle**: uses `queueMicrotask` to batch deltas that arrive in the same tick into a single re-render.

### No changes to: `src/lib/ai.ts`

The `StreamEvent` types stay exactly as they are. Markdown rendering is purely a display concern.

### Changes to: `src/cmd/question.ts`

The `streamAnswer()` function swaps plain `process.stdout.write(event.delta)` for:

```typescript
const renderer = new MarkdownRenderer();
for await (const event of stream) {
  if (event.type === "text") renderer.write(event.delta);
  // thinking/error unchanged — thinking stays plain dim text on stderr
}
renderer.end();
```

### New file: `src/lib/markdown.test.ts`

Side-by-side tests for the renderer.

## Public API

```typescript
export class MarkdownRenderer {
  constructor(opts?: { stream?: NodeJS.WriteStream });
  write(delta: string): void;
  end(): void;
}
```

A single `write` method is all the caller needs. No line counting, no cursor math, no TTY branching visible outside.

## Implementation notes

- **Token walker**: walk `marked`'s token tree, emit ANSI via picocolors for inline styles, wrap code blocks in a dim/reset background.
- **Cursor management**: calculate rendered line count with `Math.ceil(renderedText.length / terminal.columns)`, emit `\x1b[A` (cursor up) + `\x1b[J` (clear to end) before writing updated output.
- **OSC 8 links**: on supported terminals, emit `\x1b]8;;url\x1b\\text\x1b]8;;\x1b\\`. Skip if `NO_TERM_HYPERLINKS` env var is set.
