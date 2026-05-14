Status: ready-for-agent

## Parent

`.scratch/btw-core/PRD.md`

## What to build

Add shell session awareness to btw via `btw init` and the `$BTW_SESSION_ID` environment variable.

`btw init` outputs a shell script that generates a unique session ID and exports it. The output is designed for `eval "$(btw init)"` in the User's shell config (`.zshrc`, `.bashrc`).

When `$BTW_SESSION_ID` is set, btw stores Q&A pairs in `~/.local/share/btw/sessions/<session-id>.jsonl` (one JSON object per line). On each invocation, previous entries from the current session are read and included as context in the request to the AI.

Without `$BTW_SESSION_ID`, btw works as a one-shot tool with no context.

## Acceptance criteria

- [ ] `btw init` outputs a shell script that generates and exports `$BTW_SESSION_ID`
- [ ] When `$BTW_SESSION_ID` is set, Q&A pairs are appended to `~/.local/share/btw/sessions/<session-id>.jsonl`
- [ ] Previous Q&A pairs from the same session are included as context in AI requests
- [ ] Without `$BTW_SESSION_ID`, btw runs with no session context (one-shot)
- [ ] Session module is tested with temporary directories for append/read round-trips and context assembly

## Blocked by

- `.scratch/btw-core/issues/01-core-qa-pipeline.md`
