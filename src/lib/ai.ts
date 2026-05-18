import type { AuthService } from "@/lib/auth";
import type { ConfigError, ConfigSchema, ConfigService } from "@/lib/config";
import type { JsonStoreError } from "@/lib/json-store";
import { type ParsedModel, parseModelString } from "@/lib/model";
import { ModelRegistry } from "@/lib/model-registry";

import { Agent } from "@earendil-works/pi-agent-core";
import type { Model } from "@earendil-works/pi-ai";
import { err, isErr, ok, type Result } from "@justmiracle/result";

////////////////////////////////////////////////////////////////////////////////////
const REASON_MESSAGES = {
  "api-error": "API request failed",
  authentication: "Authentication failed. Check your API key is correct.",
  quota: "API quota exceeded. Check your billing plan or try a different provider.",
  "rate-limit": "Rate limited. Wait a moment and try again.",
  timeout: "Request timed out. The model took too long to respond.",
  network: "Network error. Check your internet connection and try again.",
  "model-not-found": "Model not found. Check the model name is correct.",
  "no-model": "No model configured. Use `btw model` to set up a model first.",
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
  | { type: "thinking_start" }
  | { type: "thinking"; delta: string }
  | { type: "thinking_end" }
  | { type: "error"; error: StreamError };

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

function resolveModel(provider: string, model: string): Result<Model<never>, AiError> {
  const resolved = new ModelRegistry().getModel(provider, model);

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

  return ok(resolved.value);
}

export class AiService {
  constructor(
    readonly config: ConfigService,
    readonly auth: AuthService,
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

    if (!modelString) {
      return err(
        new AiError({
          reason: "no-model",
          message: REASON_MESSAGES["no-model"],
        }),
      );
    }

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

  async streamQuestion(
    question: string,
    config: ModelConfig,
    onEvent: (event: StreamEvent) => void,
    opts?: { signal?: AbortSignal },
  ): Promise<void> {
    const modelLookup = resolveModel(config.provider, config.model);
    if (isErr(modelLookup)) {
      onEvent({ type: "error", error: modelLookup.error });
      return;
    }

    const agent = new Agent({
      initialState: { model: modelLookup.value, thinkingLevel: "minimal" },
      getApiKey: () => config.apiKey,
    });

    opts?.signal?.addEventListener("abort", () => agent.abort(), { once: true });

    agent.subscribe((event) => {
      if (event.type !== "message_update") return;
      const ev = event.assistantMessageEvent;
      switch (ev.type) {
        case "thinking_start":
          onEvent({ type: "thinking_start" });
          break;
        case "thinking_delta":
          onEvent({ type: "thinking", delta: ev.delta });
          break;
        case "thinking_end":
          onEvent({ type: "thinking_end" });
          break;
        case "text_delta":
          onEvent({ type: "text", delta: ev.delta });
          break;
      }
    });

    agent.prompt(question).catch((e) => {
      console.error("Error during agent prompt:", e);
      if (!opts?.signal?.aborted) {
        onEvent({ type: "error", error: toAiError(e) });
      }
    });

    await agent.waitForIdle();
  }
}
