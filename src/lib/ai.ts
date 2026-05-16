import type { AuthService } from "@/lib/auth";
import type { ConfigError, ConfigSchema, ConfigService } from "@/lib/config";
import type { JsonStoreError } from "@/lib/json-store";
import { type ParsedModel, parseModelString } from "@/lib/model";

import { getModel, type Model, stream } from "@earendil-works/pi-ai";
import { err, isErr, makeSafe, ok, type Result } from "@justmiracle/result";

////////////////////////////////////////////////////////////////////////////////////
const REASON_MESSAGES = {
  "api-error": "API request failed",
  authentication: "No API key available",
  quota: "API quota exceeded",
  "rate-limit": "Rate limit exceeded",
  timeout: "Request timed out",
  network: "Network error",
  "model-not-found": "Model is not available",
} as const;

export type AiReason = keyof typeof REASON_MESSAGES;

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

const ERROR_MATCHERS = [
  { patterns: ["401", "unauthorized"], reason: "authentication" as const },
  { patterns: ["429", "rate limit"], reason: "rate-limit" as const },
  { patterns: ["402", "quota", "billing"], reason: "quota" as const },
  { patterns: ["timeout"], reason: "timeout" as const },
  { patterns: ["econnrefused", "enotfound", "fetch failed"], reason: "network" as const },
  { patterns: ["not found", "404"], reason: "model-not-found" as const },
];

function extractMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}

function toAiError(error: unknown): AiError {
  const msg = extractMessage(error);
  const lower = msg.toLowerCase();

  const reason: AiReason =
    ERROR_MATCHERS.find(({ patterns }) => patterns.some((p) => lower.includes(p)))?.reason ??
    "api-error";

  return new AiError({
    reason,
    message: REASON_MESSAGES[reason],
    cause: error,
    meta: { originalMessage: msg },
  });
}
////////////////////////////////////////////////////////////////////////////////////

export type StreamError = AiError | ConfigError | JsonStoreError;

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "thinking"; delta: string }
  | { type: "error"; error: StreamError };

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

function resolveModel(provider: string, model: string): Result<Model<never>, AiError> {
  const safeGetModel = makeSafe(getModel);

  const resolved = safeGetModel(provider as never, model as never);

  if (isErr(resolved)) {
    return err(
      new AiError({
        reason: "model-not-found",
        message: REASON_MESSAGES["model-not-found"],
        cause: resolved.error,
        meta: { provider, model },
      }),
    );
  }

  if (!resolved.value) {
    return err(
      new AiError({
        reason: "model-not-found",
        message: REASON_MESSAGES["model-not-found"],
        meta: { provider, model },
      }),
    );
  }

  return ok(resolved.value);
}

export class AiService {
  constructor(
    private config: ConfigService,
    private auth: AuthService,
  ) {}

  async getModelConfig(
    modelOverride?: string,
  ): Promise<Result<ModelConfig, ConfigError | JsonStoreError | AiError>> {
    const configResult = await this.config.readConfig();
    if (isErr(configResult)) return configResult;

    const modelResult = this.resolveModelString(configResult.value, modelOverride);
    if (isErr(modelResult)) return modelResult;

    const { provider, model } = modelResult.value;

    const keyResult = await this.resolveCredentials(provider);
    if (isErr(keyResult)) return keyResult;

    const modelLookup = resolveModel(provider, model);
    if (isErr(modelLookup)) return modelLookup;

    return ok({ provider, model, apiKey: keyResult.value });
  }

  private resolveModelString(
    config: ConfigSchema,
    override?: string,
  ): Result<ParsedModel, AiError> {
    const modelString = override ?? config.model;

    const parsed = parseModelString(modelString);
    if (isErr(parsed)) {
      return err(
        new AiError({
          reason: "model-not-found",
          message: REASON_MESSAGES["model-not-found"],
          cause: parsed.error,
          meta: { input: modelString },
        }),
      );
    }

    return parsed;
  }

  private async resolveCredentials(
    provider: string,
  ): Promise<Result<string, JsonStoreError | AiError>> {
    const keyResult = await this.auth.getApiKey(provider);
    if (isErr(keyResult)) return keyResult;

    if (!keyResult.value) {
      return err(
        new AiError({
          reason: "authentication",
          message: REASON_MESSAGES.authentication,
          meta: { provider },
        }),
      );
    }

    return ok(keyResult.value);
  }

  async *streamQuestion(
    question: string,
    config: ModelConfig,
    opts?: { signal?: AbortSignal },
  ): AsyncGenerator<StreamEvent, void, void> {
    const modelLookup = resolveModel(config.provider, config.model);
    if (isErr(modelLookup)) {
      yield { type: "error", error: modelLookup.error };
      return;
    }

    const s = stream(
      modelLookup.value,
      { messages: [{ role: "user" as const, content: question, timestamp: Date.now() }] },
      { signal: opts?.signal, apiKey: config.apiKey || undefined },
    );

    try {
      for await (const event of s) {
        switch (event.type) {
          case "text_delta":
            yield { type: "text", delta: event.delta };
            break;
          case "thinking_delta":
            yield { type: "thinking", delta: event.delta };
            break;
          case "error":
            yield {
              type: "error",
              error: toAiError(event.error.errorMessage ?? "Unknown error"),
            };
            break;
        }
      }
    } catch (e) {
      yield { type: "error", error: toAiError(e) };
    }
  }
}
