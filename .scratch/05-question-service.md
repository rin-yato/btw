# 05 — Question service

**Status:** pending

## Detail

Create `src/lib/question.ts` + test — **new file**. Extracts the Q&A orchestration currently inlined in `index.ts:handleQuestion`.

### Interface

```typescript
interface QuestionOptions {
  noThinking: boolean;
  modelOverride?: string;
  signal?: AbortSignal;
}

askQuestion(
  question: string,
  opts?: QuestionOptions,
): AsyncGenerator<StreamEvent, void, QuestionError>;
```

Internal flow:
1. Call `getModelConfig(modelOverride)` from `lib/ai`
2. Create `AbortController` and wire `SIGINT` to `controller.abort()`
3. Call `streamQuestion(question, config, { signal: controller.signal })` from `lib/ai`
4. Yield each `StreamEvent`
5. On error: yield through `QuestionError` with the original error in `meta.cause`

### Acceptance criteria

- [ ] `askQuestion` returns `AsyncGenerator<StreamEvent, void, QuestionError>`
- [ ] `SIGINT` during streaming correctly aborts the controller and stops the generator
- [ ] Errors from upstream (`AiError`, `ConfigError`, `AuthError`) are wrapped in `QuestionError` with original in `meta`
- [ ] `noThinking` option is passed through to the caller (filtering happens in `index.ts`)
- [ ] `bun test` passes
- [ ] `bun run typecheck` passes
