Status: ready-for-agent

## Parent

`.scratch/btw-core/PRD.md`

## What to build

Implement `btw model`, an interactive subcommand for selecting the AI model.

The command queries `@earendil-works/pi-ai` for available models from the configured provider. It displays an interactive list, the User picks one, and btw updates the config file with the chosen model ID.

## Acceptance criteria

- [ ] `btw model` queries pi-ai for the configured provider's available models
- [ ] Models are displayed in an interactive selection list
- [ ] User selects a model and the config is updated
- [ ] If no provider is configured, show a helpful message pointing to `btw connect`
- [ ] Tests cover model selection logic and config update

## Blocked by

- `.scratch/btw-core/issues/03-config-connect-firstrun.md`
