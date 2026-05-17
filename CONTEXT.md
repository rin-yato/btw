# btw

CLI tool for asking AI questions in the terminal.

## Language

**Question**:
A string of text a user submits to get an AI answer.
_Avoid_: Query, prompt (as a noun for user input)

**Answer**:
The final AI response content, streamed as text to stdout.

**Thinking**:
The model's reasoning or chain-of-thought output, shown in dim text on stderr. Can be hidden with `--no-thinking`.

**Model**:
An AI model identified by a `provider:id` string (e.g. `openai:gpt-4o`). The default model is stored in config.

**Model Override**:
A `--model <provider:id>` flag that replaces the default model for a single question.

**Provider**:
An AI service that offers models (e.g. OpenAI, Anthropic, opencode).

**Credential**:
An API key stored for a **Provider** so btw can authenticate API calls to that provider.

**Connect**:
The command (`btw connect`) that stores a **Credential** for a **Provider**, making that provider's models available for use.

**Inline Mode**:
Running `btw <question>` to ask a **Question** directly as a command argument.

**Interactive Mode**:
Running `btw` with no arguments to type a **Question** via a multiline prompt.

## Relationships

- A **Question** is submitted via **Inline Mode** or **Interactive Mode**
- A **Question** is sent to a **Model**
- A **Model** belongs to a single **Provider**
- A **Model** returns an **Answer** and optionally **Thinking**
- **Connect** stores a **Credential** for a **Provider**, making its **Models** available
- A **Model Override** overrides the default **Model** for a single **Question**

## Example dialogue

> **Dev:** "After a user writes `btw connect` and stores their API key, which models are available?"
> **Domain expert:** "All **Models** from that **Provider** become available. Use `btw model` to pick a default, or `--model <provider:id>` for a one-shot override."
> **Dev:** "And if they just type `btw` with no arguments?"
> **Domain expert:** "That's **Interactive Mode** — they type the **Question** into a multiline prompt instead of passing it inline."

