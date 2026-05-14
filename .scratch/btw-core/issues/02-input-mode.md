Status: ready-for-agent

## Parent

`.scratch/btw-core/PRD.md`

## What to build

When the User runs `btw` with no arguments, open a multiline text input where they can compose a complex question. The input should accept multiple lines and submit on a clear key sequence (e.g. Ctrl+D or Meta+Enter). Once submitted, the question goes through the same response pipeline built in issue 01 (streaming, cancellation, thinking, errors).

## Acceptance criteria

- [ ] `btw` with no arguments opens a multiline text input
- [ ] User can type multiple lines with special characters
- [ ] A clear key sequence submits the question
- [ ] The response pipeline from issue 01 handles the submitted question
- [ ] Edge cases: empty input shows a提示 message or re-prompts

## Blocked by

- `.scratch/btw-core/issues/01-core-qa-pipeline.md`
