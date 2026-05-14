Status: ready-for-agent

## Parent

`.scratch/btw-core/PRD.md`

## What to build

Add a `showThinking` boolean to the config schema (default `true`) and a `--no-thinking` CLI flag that suppresses reasoning content for a single invocation. When thinking is disabled, only the final text response is displayed.

## Acceptance criteria

- [ ] Config has a `showThinking` field (default `true`)
- [ ] `--no-thinking` flag overrides the config for one invocation
- [ ] When thinking is disabled, thinking/reasoning content is suppressed from the output
- [ ] Tests cover the flag parsing and config toggle interaction

## Blocked by

- `.scratch/btw-core/issues/01-core-qa-pipeline.md`
