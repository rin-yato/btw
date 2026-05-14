Status: ready-for-agent

## Parent

`.scratch/btw-core/PRD.md`

## What to build

Replace the raw text output with a custom markdown renderer that uses ANSI escape codes to style the response in the terminal. Supports headings, code blocks (with syntax highlighting), bold, italic, lists, and inline code. Built in-house with no external rendering dependencies.

## Acceptance criteria

- [ ] Headings are rendered with appropriate ANSI formatting
- [ ] Code blocks use syntax highlighting
- [ ] Bold and italic text are styled correctly
- [ ] Lists are indented and styled
- [ ] Inline code is highlighted
- [ ] Each markdown element type has a corresponding test
- [ ] Complex documents render correctly (snapshot-style tests)

## Blocked by

- `.scratch/btw-core/issues/01-core-qa-pipeline.md`
