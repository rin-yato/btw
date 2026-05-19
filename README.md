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

The default model (`opencode:deepseek-v4-flash-free`) works out of the box with no API key. To use other providers, run `btw connect` and `btw model`.

## Usage

```
btw <question>          Ask a question (inline mode)
btw                     Open multiline input (interactive mode)
btw connect             Store an API key for a provider
btw model               Set your default model
btw --help              Show help
btw --version           Print version
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

## Setup

To use a different provider and model:

1. **`btw connect`** — pick a provider and enter your API key. This stores a credential and makes that provider's models available.
2. **`btw model`** — choose a default model from your connected providers.

## Configuration

| Data | Path |
|------|------|
| Config (model, preferences) | `~/.config/btw/config.json` |
| Credentials (API keys) | `~/.cache/btw/auth.json` |

## Features

- **Streaming Markdown renderer** — headings, code blocks with syntax highlighting, tables, blockquotes, lists, links (OSC-8 hyperlinks), and more
- **Thinking/Reasoning support** — model chain-of-thought rendered in dim text on stderr (`--no-thinking` to hide)
- **Inline & Interactive modes** — pass a question as an argument or open a multiline prompt
- **Custom model override** — `--model provider:id` for one-shot model switching without reconfiguration

## Contributing

Contributions are welcome! See [CONTEXT.md](CONTEXT.md) for the domain language and [AGENTS.md](AGENTS.md) for architecture and conventions.

```bash
git clone git@github.com:rin-yato/btw.git
cd btw
bun install
bun run dev          # run the CLI
bun test             # run tests
bun run check        # biome lint
bun run typecheck    # tsc --noEmit
bun run ci           # lint → typecheck → test → build
```

## License

MIT — see [LICENSE](LICENSE).
