# 04 — AI service

**Status:** pending

## Detail

Create `src/lib/ai.ts` + test alongside the existing `src/ai.ts`. Old file stays untouched.

Extracts the AI provider wrapper. Fixes the dead `modelOverride` parameter that is currently parsed by `cli.ts` but silently discarded.

### Interface

```typescript
interface StreamEvent {
  type: "text" | "thinking";
  delta: string;
}

interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

getModelConfig(modelOverride?: string): Promise<Result<ModelConfig, AiError>>;
// modelOverride format: "provider:model" — splits on ":" to extract provider and model

streamQuestion(
  question: string,
  config: ModelConfig,
  opts?: { signal?: AbortSignal },
): AsyncGenerator<StreamEvent, void, AiError>;
```

- `getModelConfig` reads config via `lib/config`, auth via `lib/auth`, and applies `modelOverride` if provided
- `modelOverride` of `"anthropic:claude-sonnet-4-20250514"` sets provider to `anthropic` and model to `claude-sonnet-4-20250514`
- `getModelConfig` reads config once (fixes the double-read bug)
- `streamQuestion` wraps `@earendil-works/pi-ai` streaming, maps events to `StreamEvent`, handles errors

### Acceptance criteria

- [ ] `getModelConfig()` returns `Result<ModelConfig, AiError>` — no thrown exceptions
- [ ] `modelOverride` correctly overrides both provider and model when provided
- [ ] Config is read exactly once (not twice)
- [ ] `streamQuestion` yields `StreamEvent` objects for text and thinking deltas
- [ ] `streamQuestion` yields `AiError` through the generator on API errors
- [ ] Old `src/ai.ts` still works, old tests still pass
- [ ] New `src/lib/ai.test.ts` covers: model config resolution, override application, streaming shape
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
