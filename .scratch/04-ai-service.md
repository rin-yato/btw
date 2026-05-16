# 04 — AI service

**Status:** done

## Detail

Create `src/lib/ai.ts` + test alongside the existing `src/ai.ts`. Old file stays untouched.

Wraps `@earendil-works/pi-ai` for streaming. Fixes the dead `modelOverride` parameter (currently parsed by `cli.ts` but silently discarded). Eliminates the default disagreement (`config.ts` uses `openai`, `ai.ts` uses `github-copilot`).

### Patterns (follow lib/config.ts, lib/auth.ts)

- **Class with constructor DI**: `AiService` takes `ConfigService` and `AuthService`
- **async/await with early return**
- **Store errors bubble up**: config/auth failures return their own error types — no wrapping in `AiError`
- **`AiError` only for AI-specific failures**: API errors, auth rejection, quota, rate limits, timeouts, network errors, model not found
- **Use `parseModelString` from `model.ts`** for `modelOverride` parsing
- **Side-by-side test**: `src/lib/ai.test.ts` with mocked pi-ai

### Error class

```typescript
export type AiReason =
  | "api-error"
  | "authentication"
  | "quota"
  | "rate-limit"
  | "timeout"
  | "network"
  | "model-not-found";

export class AiError extends Error {
  declare readonly reason: AiReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: AiReason;
    message: string;
    cause?: unknown;
    meta?: Record<string, unknown>;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = this.constructor.name;
    this.reason = opts.reason;
    this.meta = opts.meta ?? {};
  }
}
```

### Shared types (also used by lib/question.ts)

```typescript
export interface StreamEvent {
  type: "text" | "thinking";
  delta: string;
}

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}
```

### Interface

```typescript
export class AiService {
  constructor(
    private config: ConfigService,
    private auth: AuthService,
  ) {}

  getModelConfig(
    modelOverride?: string,
  ): Promise<Result<ModelConfig, ConfigError | JsonStoreError | AiError>>;

  streamQuestion(
    question: string,
    config: ModelConfig,
    opts?: { signal?: AbortSignal },
  ): AsyncGenerator<StreamEvent, void, AiError>;
}
```

### Flows

#### getModelConfig

1. Read config via `this.config.readConfig()`
2. If error → bubble up (`ConfigError | JsonStoreError`)
3. Get base `provider:model` from config or defaults
4. If `modelOverride` is provided → `parseModelString(modelOverride)` → override provider and model
5. Read API key via `this.auth.getApiKey(provider)`
6. If auth error → bubble up (`JsonStoreError`)
7. If no key found → `err(AiError)` with reason `"authentication"`
8. Look up model via `getModel(provider, model)` from pi-ai
9. If model not found → `err(AiError)` with reason `"model-not-found"`
10. Return `ok({ provider, model, apiKey })`

#### streamQuestion

1. Create pi-ai `stream()` with the model, messages, signal, apiKey
2. For-await each event:
   - `text_delta` → yield `{ type: "text", delta }`
   - `thinking_delta` → yield `{ type: "thinking", delta }`
   - `error` → throw `AiError` from generator (mapped from pi-ai error)

### pi-ai error mapping

Pi-ai error strings → `AiReason`:

| pi-ai error pattern | AiReason |
|---|---|
| 401 / unauthorized | authentication |
| 429 / rate limit | rate-limit |
| 402 / quota / billing | quota |
| timeout | timeout |
| ECONNREFUSED / ENOTFOUND / fetch failed | network |
| model not found / 404 | model-not-found |
| anything else | api-error |

### Acceptance criteria

- [ ] `getModelConfig()` returns `Result<ModelConfig, …>` — no thrown exceptions
- [ ] `modelOverride` correctly overrides both provider and model when provided (e.g. `"anthropic:claude-sonnet-4-20250514"`)
- [ ] Config is read exactly once (not twice)
- [ ] Single source of defaults — no disagreement between config and ai defaults
- [ ] Missing API key returns `err(AiError)` with reason `"authentication"`
- [ ] `streamQuestion` yields `{ type: "text" | "thinking", delta: string }` events
- [ ] `streamQuestion` throws `AiError` on pi-ai errors
- [ ] Old `src/ai.ts` still works, old tests still pass
- [ ] New `src/lib/ai.test.ts` covers: model config resolution, modelOverride, missing key, streaming shape
- [ ] `bun test` passes
