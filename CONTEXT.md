# btw

A terminal-native AI Q&A tool that lets users ask questions without opening a browser.

## Language

**btw**:
The CLI tool itself. Lowercase.
_Avoid_: BTW, "By the way"

**User**:
A person who runs btw from their terminal.
_Avoid_: Developer, Person

**Configuration** (or **config**):
The set of persistent settings that control btw's behavior, stored in a config file.
_Avoid_: Settings, preferences

**Config file**:
The file on disk (XDG-standard, e.g. `~/.config/btw/config.json`) containing the configuration.
_Avoid_: Settings file, dotfile

**Flag**:
A CLI argument passed directly to a btw invocation that overrides a config value for that single use.
_Avoid_: Option, switch

**Provider**:
An AI service that offers one or more models (e.g. OpenAI, Anthropic, Google, Groq). btw delegates to `@earendil-works/pi-ai` to abstract provider differences.
_Avoid_: Backend, service, vendor

**Model**:
A specific LLM offered by a Provider (e.g. `gpt-4o-mini`, `claude-sonnet-4`). Identified by provider name + model ID.

## Commands

**Inline mode**:
`btw <question>` — the User passes the question as a CLI argument for quick single-shot use.

**Input mode**:
`btw` with no arguments — opens a multiline text input where the User composes a question. Used for complex questions containing characters that would be awkward to escape in a shell.

**Shell hook** (or **`btw init`**):
A shell setup invoked via `eval "$(btw init)"` that runs on shell startup. It assigns a unique **Session ID** and exports it as `$BTW_SESSION_ID`.

**Session**:
A group of btw questions and answers that occurred in the same terminal session, identified by the **Session ID**. Sessions let the User review history per shell session.

**Session store**:
The on-disk location for session data, at `~/.local/share/btw/sessions/`. Not mixed with the **Config file**.

**`btw connect`**:
An interactive subcommand that shows a list of available **Providers**. After the User selects one, btw shows the supported authentication methods (initially just `apiKey`), and prompts for credentials.

**`btw model`**:
An interactive subcommand that shows a list of available **Providers**, then their **Models**, and updates the **Configuration** with the User's selection.

## Standard commands

**`btw --help`** / **`btw -h`**:
Shows usage information and available commands.

**`btw --version`** / **`btw -v`**:
Prints the installed version.

## Behavior

**First run**: When a **User** runs **btw** for the first time with no **Configuration**, a welcome message with setup instructions is displayed.

**Cancellation**: The **User** can press Ctrl+C during a response. The partial output remains visible on screen.

**Thinking**: When the **Model** supports reasoning, btw shows the thinking content by default. The User can disable this in the **Configuration**.

**Error handling**: Errors (network failures, invalid API keys, etc.) are printed as human-readable messages, not raw stack traces.

## Configuration

Authentication credentials (e.g. API keys) are stored in the **Config file** alongside the selected **Provider** and **Model**.

## Relationships

- A **User** runs **btw** to ask an AI question
- **btw** renders the AI's response as formatted markdown in the terminal
- A **User** configures **btw** via the **Config file**, **Flags**, or the **`btw model`** command
- A **Flag** overrides a value in the **Configuration** for one invocation
- **btw** uses `@earendil-works/pi-ai` to communicate with a **Provider**
- A **Provider** offers one or more **Models**

## Example dialogue

> **Dev:** "When a **User** invokes **btw**, does the answer stream to stdout in real time?"
> **Domain expert:** "Yes — btw streams the response token by token so the terminal feels conversational."
>
> **Dev:** "What happens if the User passes `--model openai/gpt-4o-mini` but the config file already has a model set?"
> **Domain expert:** "The **Flag** wins for that invocation. The **Config file** is unchanged."

## Flagged ambiguities

(none yet)
