Status: ready-for-agent

## Problem Statement

Developers often need quick answers from AI without context-switching to a browser. Existing solutions require opening a web app, managing multiple tabs, or breaking terminal flow. btw solves this by bringing AI Q&A directly into the terminal with zero friction — type a question, get an answer, stay in the flow.

## Solution

btw is a terminal-native CLI tool that lets users ask AI questions and receive formatted markdown answers directly in the terminal. It supports two input modes (inline argument and interactive multiline), automatic session context, and configurable provider/model selection via an intuitive interactive setup flow.

## User Stories

1. As a User, I want to ask a quick question by typing `btw <question>`, so that I get an answer without leaving my terminal.
2. As a User, I want to run `btw` with no arguments and compose a complex question in a multiline input, so that I can include special characters and multi-sentence questions without shell escaping issues.
3. As a User, I want the answer rendered as formatted markdown in my terminal, so that code blocks, lists, and headings are easy to read.
4. As a User, I want to set up my AI provider and API key by running `btw connect`, so that I can authenticate without editing config files manually.
5. As a User, I want to choose my preferred AI model by running `btw model`, so that I can pick the best model for my needs from a list.
6. As a User, I want my provider and model choice saved in a config file, so that I don't have to specify them every time.
7. As a User, I want to override the configured model for a single question via a `--model` flag, so that I can occasionally use a different model without changing my config.
8. As a User, I want `btw --help` to show available commands, so that I can discover what btw can do.
9. As a User, I want `btw --version` to print the installed version, so that I can verify my installation.
10. As a User, I want to press Ctrl+C to cancel a long-running response, so that I can interrupt btw if needed while keeping the partial output visible.
11. As a User, I want to see the AI's thinking/reasoning content by default, so that I can understand how the model arrived at its answer.
12. As a User, I want to disable thinking output in the config, so that I only see the final answer when preferred.
13. As a User, I want errors (network failures, invalid API keys) displayed as human-readable messages, so that I can understand and fix the issue without reading stack traces.
14. As a User, I want a welcome message with setup instructions the first time I run btw, so that I know what to do next.
15. As a User, I want to add `eval "$(btw init)"` to my shell config so that btw tracks my terminal sessions automatically.
16. As a User, I want btw to include my previous Q&As from the current session as context, so that follow-up questions are understood without re-explaining.
17. As a User, I want to disable thinking output via a `--no-thinking` flag, so that I can suppress it for a single invocation.

## Implementation Decisions

### Modules

**CLI entry** — argument parsing and command dispatch. Uses Bun's built-in argument parsing or a minimal CLI framework. Dispatches to subcommands: inline mode, input mode, `connect`, `model`, `init`, `--help`, `--version`.

**Config** — reads and writes `~/.config/btw/config.json`. Uses XDG directory conventions. Schema includes `provider`, `model`, `apiKey`, `showThinking`. Exposes a simple get/set interface. Deep module — testable with temporary directories.

**Auth** — `btw connect` flow. Queries `@earendil-works/pi-ai`'s provider registry, shows an interactive selection list, prompts for auth method (initially `apiKey`), stores credentials in the config file.

**Model selector** — `btw model` flow. Queries `@earendil-works/pi-ai` for available models from the configured provider, shows interactive selection, updates config.

**AI client** — thin wrapper around `@earendil-works/pi-ai`'s `stream()` API. Handles sending the question, streaming the response token-by-token, cancellation (AbortController), and extracting thinking content. Uses pi-ai's faux provider for testing.

**Markdown renderer** — renders AI response text as formatted markdown in the terminal using ANSI escape codes. Supports headings, code blocks (with syntax highlighting), bold, italic, lists, inline code. Tests cover rendering each element type.

**Shell hook** — `btw init` outputs a shell script that generates a unique session ID and exports `$BTW_SESSION_ID`. The ID is a UUID or similar. Output is designed to be eval'd: `eval "$(btw init)"`.

**Session** — stores Q&A pairs in `~/.local/share/btw/sessions/<session-id>.jsonl`. On each invocation, reads previous entries from the current session (identified by `$BTW_SESSION_ID`) and includes them in the context sent to the AI. Deep module — testable with temporary directories.

**Terminal UI** — interactive multiline text input for input mode. Accepts multi-line input, terminates on a configurable key sequence (e.g. Ctrl+D or Meta+Enter). Also handles loading/progress indicators during streaming and pretty error display.

### Architecture notes

- All provider/model/AI logic delegates to `@earendil-works/pi-ai`. btw never calls provider APIs directly.
- The config file and session store are separate directories — config at XDG config home, sessions at XDG data home.
- Session context is opt-in by having the shell hook installed. Without it, btw works as a one-shot tool with no context.
- The markdown renderer is built in-house (no external dependency) for full control over terminal styling.

## Testing Decisions

- A good test verifies external behavior, not implementation details.
- **Config** — test read/write round-trips, missing file handling, schema validation, XDG path resolution.
- **Session** — test append/read from session store, context assembly from previous entries, session ID parsing.
- **AI client** — test question sending, streaming events, cancellation, thinking extraction. Use `@earendil-works/pi-ai`'s faux provider.
- **Markdown renderer** — test each markdown element type renders the expected ANSI sequences. Snapshot-style tests for complex documents.
- **CLI entry** — test subcommand dispatch, `--help`/`--version` output, error exit codes.

## Out of Scope

- Pipe input (`command | btw`)
- System prompt customization
- History browsing UX (`btw history`)
- Multi-turn conversation within one invocation
- OAuth-based provider auth (future)
- Plugin/extension system
- Non-ai provider support (local models, etc.)

## Further Notes

- The project uses Bun as the runtime and package manager.
- `@earendil-works/pi-ai` is the only AI SDK dependency.
- Minimum TypeScript strict mode.
- Version starts at 0.1.0.
