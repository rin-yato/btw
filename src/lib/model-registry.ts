import { CUSTOM_MODELS } from "@/lib/custom-models";

import {
  type Model,
  getModel as piGetModel,
  getModels as piGetModels,
  getProviders as piGetProviders,
} from "@earendil-works/pi-ai";
import { err, isErr, makeSafe, ok, type Result } from "@justmiracle/result";

////////////////////////////////////////////////////////////////////////////////////
const REASON_MESSAGES = {
  "model-not-found": "Model not found. Check the model name is correct.",
} as const;

type ModelRegistryReason = keyof typeof REASON_MESSAGES;

export class ModelRegistryError extends Error {
  declare readonly reason: ModelRegistryReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: ModelRegistryReason;
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
////////////////////////////////////////////////////////////////////////////////////

const OPENCODE_STATIC_HEADERS = {
  "User-Agent": "opencode/1.15.3",
  Authorization: "Bearer public",
  "x-opencode-client": "cli",
  "x-opencode-session": "ses_01JQXYZ3K7MN0RSTUVWXYZabcd",
  "x-opencode-request": "msg_01JQXYZ3K7MN0RSTUVWXYZefgh",
  "x-opencode-project": "global",
} as const;

export class ModelRegistry {
  getModel(provider: string, modelId: string): Result<Model<never>, ModelRegistryError> {
    const custom = CUSTOM_MODELS[provider]?.[modelId];
    if (custom) return ok(custom as Model<never>);

    const safeGetModel = makeSafe(piGetModel);
    const resolved = safeGetModel(provider as never, modelId as never);

    if (isErr(resolved)) {
      return err(
        new ModelRegistryError({
          reason: "model-not-found",
          message: REASON_MESSAGES["model-not-found"],
          cause: resolved.error,
          meta: { provider, model: modelId },
        }),
      );
    }

    if (!resolved.value) {
      return err(
        new ModelRegistryError({
          reason: "model-not-found",
          message: REASON_MESSAGES["model-not-found"],
          meta: { provider, model: modelId },
        }),
      );
    }

    if (provider === "opencode") {
      return ok({
        ...resolved.value,
        headers: {
          ...resolved.value.headers,
          ...OPENCODE_STATIC_HEADERS,
        },
      });
    }

    return ok(resolved.value);
  }

  listModels(provider: string): Model<never>[] {
    const builtin = piGetModels(provider as never) as Model<never>[];

    const custom = CUSTOM_MODELS[provider];
    if (!custom) return builtin;

    const knownIds = new Set(builtin.map((m) => m.id));
    const additional = Object.values(custom).filter(
      (e) => !knownIds.has(e.id),
    ) as Model<never>[];

    return [...builtin, ...additional];
  }

  listProviders(): string[] {
    return piGetProviders();
  }
}
