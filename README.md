# btw

AI answers in your terminal.

## Quick start

```bash
# Install
npm install -g btw

# Connect to a provider and store your API key
btw connect

# Pick a default model (required)
btw model

# Ask anything
btw "what is 2+2"
btw "how do I update a dep to latest with bun"
```

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

## Model override

Run any question with a different model, no reconfiguration needed:

```bash
btw --model opencode:deepseek-v4-flash-free "explain quantum computing"
```

## Setup

1. **`btw connect`** — pick a provider and enter your API key. This stores a credential and makes that provider's models available.
2. **`btw model`** — choose a default model from your connected providers.

After setup, just ask questions. Your default model is used automatically.

## About

**btw** is a single-question, single-answer CLI. No threads, no sessions — just a question and an answer, streamed to your terminal. Supports any provider from `@earendil-works/pi-ai`.

The names `btw`, `qq`, and `q` all run the same tool — use whichever is shortest.

## Configuration

| Data | Path |
|------|------|
| Config (model, preferences) | `~/.config/btw/config.json` |
| Credentials (API keys) | `~/.cache/btw/auth.json` |

## Development

```bash
git clone <url>
cd btw
bun install
bun run dev          # run the CLI
bun test             # run tests
bun run check        # biome lint
bun run typecheck    # tsc --noEmit
bun run ci           # lint → typecheck → test → build
```

## License

MIT
