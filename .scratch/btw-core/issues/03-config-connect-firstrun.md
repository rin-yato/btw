Status: ready-for-agent

## Parent

`.scratch/btw-core/PRD.md`

## What to build

Implement the persistent configuration system and the `btw connect` interactive auth flow.

The config file lives at `~/.config/btw/config.json` (XDG config home). Schema: `provider`, `model`, `apiKey`, `showThinking`. Expose a simple get/set/read/write interface.

`btw connect` queries pi-ai's provider registry, shows an interactive provider selection list, then prompts the User for an API key. Credentials are saved to the config.

Support a `--model <provider/model>` flag that overrides the configured model for a single invocation.

On first run (no config file exists), show a welcome message with setup instructions instead of an error.

## Acceptance criteria

- [ ] Config file is created at `~/.config/btw/config.json` on first write
- [ ] Config module exposes get/set/read/write with the expected schema
- [ ] `btw connect` shows an interactive list of providers from pi-ai
- [ ] User selects a provider and enters an API key
- [ ] Credentials are persisted in the config file
- [ ] `--model` flag overrides the configured model for one invocation
- [ ] First run (no config) shows a welcome message with instructions
- [ ] Config module is tested with temporary directories for read/write round-trips and schema validation

## Blocked by

- `.scratch/btw-core/issues/01-core-qa-pipeline.md`
