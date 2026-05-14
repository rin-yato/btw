Status: ready-for-agent

## Parent

`.scratch/btw-core/PRD.md`

## What to build

The end-to-end core flow: a User runs `btw "question"` from their terminal and gets a streamed AI response as raw markdown text.

Set up the Bun/TypeScript project with strict mode. Install `@earendil-works/pi-ai`. Implement the CLI entry point that parses `btw <question>`, `btw --help`, and `btw --version`. The AI client wraps pi-ai's streaming API with a hardcoded provider and model (configurable via environment variable for the API key). The response is streamed token-by-token to stdout as raw markdown text.

Support Ctrl+C cancellation that keeps partial output visible. Extract and display thinking/reasoning content from the response. Render human-readable error messages for common failures (network, invalid API key, etc.).

## Acceptance criteria

- [ ] `btw <question>` sends the question to pi-ai and streams the response to stdout
- [ ] The response appears incrementally (token by token), not all at once
- [ ] `btw --help` prints usage information
- [ ] `btw --version` prints the current version
- [ ] Ctrl+C cancels the response and keeps partial output visible
- [ ] Thinking/reasoning content is displayed when the model provides it
- [ ] Errors (network failure, invalid API key) show a human-readable message, not a stack trace
- [ ] Project uses Bun, TypeScript strict mode, and `@earendil-works/pi-ai`
- [ ] AI client is tested with pi-ai's faux provider covering streaming, cancellation, and thinking extraction

## Blocked by

None - can start immediately.
