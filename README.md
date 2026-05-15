# btw

AI answers in your terminal.

## Quick start

```bash
# Install
npm install -g btw

# Set up an AI provider
btw connect

# Ask anything
btw "what is 2+2"
btw how do i update dep to latest with bun
```

## Usage

```
btw <question>         Ask a question
btw                    Open multiline prompt
btw connect            Configure AI provider + API key
btw --help             Show help
btw --version          Print version

Options:
  --no-thinking        Hide thinking/reasoning output
  --model <provider/model>  Override model (e.g. openai/gpt-4o-mini)
```

### Model override

```bash
btw --model opencode:minimax-m2.5-free "explain quantum computing"
```

## Entrypoints

`btw`, `qq`, and `q` all run the same tool — use whichever is shortest in the moment.

## Features

- Single question, single answer — no threads, no sessions
- Multi-line input when you run without arguments
- Model thinking shown in dim text, or hide with `--no-thinking`
- Works with any provider supported by `@earendil-works/pi-ai`

## Configuration

| Data | Default path |
|---|---|
| Config | `~/.config/btw/config.json` |

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
