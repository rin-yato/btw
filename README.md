# btw

AI answers in your terminal.

https://github.com/user-attachments/assets/47880a03-6207-4b6c-a8bb-7f781988cec1

Asks a **Question** → Gets an **Answer** (with optional **Thinking**). That's it.

> **Note:** `btw`, `qq`, and `q` all run the same tool — use whichever is shortest.

## Install

```bash
npm install -g @notyato/btw
bun add -g @notyato/btw
```

## Quick start

```bash
# Ask anything - no setup required
btw "what is 2+2"
btw "how do I update a dep to latest with bun"

# Add provider
btw connect

# Select model
btw model
```

Sessions are automatic — every question builds on the previous one in a shared global context.

## Usage

```
btw <question>            Ask a question (inline mode)
btw                       Open multiline input (interactive mode)
btw connect               Store an API key for a provider
btw model                 Set your default model
btw shell                 Print export BTW_SESSION_ID for per-terminal sessions
btw shell --install       Add session init to your shell config
btw session global        Switch to global session mode
btw session per-terminal  Switch to per-terminal session mode
btw --help                Show help
btw --version             Print version
```

### Options

| Flag | Description |
|------|-------------|
| `--no-thinking` | Hide thinking/reasoning output |
| `--model <provider:model>` | Override the model for this question |

### Model override

Run any question with a different model, no reconfiguration needed:

```bash
btw --model opencode:deepseek-v4-flash-free "explain quantum computing"
```

## Sessions

btw keeps a conversation history so each question sees prior context.

| Mode | Behavior |
|------|----------|
| **Global** (default) | All questions share one session stored in `~/.config/btw/sessions/GLOBAL.json`. Run `btw session global` to switch here. |
| **Per-terminal** | Each terminal gets its own session identified by `BTW_SESSION_ID`. Run `btw session per-terminal` to enable, then add `eval $(btw shell)` to your shell config (or use `btw shell --install`). |

Session errors never interrupt your question — warnings are logged and btw continues without context.

## Setup

To use a different provider and model:

1. **`btw connect`** — pick a provider and enter your API key. This stores a credential and makes that provider's models available.
2. **`btw model`** — choose a default model from your connected providers.

## Configuration

| Data | Path |
|------|------|
| Config (model, preferences) | `~/.config/btw/config.json` |
| Credentials (API keys) | `~/.cache/btw/auth.json` |
| Session data | `~/.config/btw/sessions/GLOBAL.json` |
| Per-terminal sessions | `~/.cache/btw/sessions/{ulid}.json` |

## Features

- **Streaming Markdown renderer** — headings, code blocks with syntax highlighting, tables, blockquotes, lists, links (OSC-8 hyperlinks), and more
- **Thinking/Reasoning support** — model chain-of-thought rendered in dim text on stderr (`--no-thinking` to hide)
- **Inline & ~~Interactive modes~~** — pass a question as an argument or open a multiline prompt
- **Custom model override** — `--model provider:id` for one-shot model switching without reconfiguration
- **Conversation sessions** — automatic global context by default, per-terminal opt-in via `btw session`

## License

MIT — see [LICENSE](LICENSE).
