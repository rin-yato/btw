import { getModel, type Model, stream } from "@earendil-works/pi-ai";

import { getApiKey } from "@/auth";
import { readConfig } from "@/config";

export interface StreamEvent {
  type: "text" | "thinking";
  delta: string;
}

export interface ModelConfig {
  provider: string;
  model: string;
  apiKey: string;
}

const DEFAULT_PROVIDER = "github-copilot";
const DEFAULT_MODEL = "gpt-4o-mini";

export async function getModelConfig(): Promise<ModelConfig> {
  const cfg = await readConfig();

  const provider = cfg?.provider ?? DEFAULT_PROVIDER;
  const model = cfg?.model ?? DEFAULT_MODEL;
  const apiKey = (await getApiKey(provider)) ?? "";

  return { provider, model, apiKey };
}

export async function* streamQuestion(
  question: string,
  config: ModelConfig,
  options?: { signal?: AbortSignal; model?: Model<any> },
): AsyncGenerator<StreamEvent, void, void> {
  const resolvedModel = options?.model ?? getModel(config.provider as any, config.model);

  const messages = [{ role: "user" as const, content: question, timestamp: Date.now() }];

  const s = stream(
    resolvedModel,
    { messages },
    {
      signal: options?.signal,
      apiKey: config.apiKey || undefined,
    },
  );

  for await (const event of s) {
    switch (event.type) {
      case "text_delta":
        yield { type: "text", delta: event.delta };
        break;
      case "thinking_delta":
        yield { type: "thinking", delta: event.delta };
        break;
      case "error":
        throw new Error(event.error.errorMessage ?? "Unknown error");
    }
  }
}
