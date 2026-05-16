import { err, ok, type Result } from "@justmiracle/result";
import * as v from "valibot";

////////////////////////////////////////////////////////////////////////////////////
const REASON_MESSAGES = {
  "invalid-format": "Model string must be in provider:model format (e.g. openai:gpt-4o-mini)",
} as const;

type ModelErrorReason = keyof typeof REASON_MESSAGES;

export class ModelError extends Error {
  declare readonly reason: ModelErrorReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: ModelErrorReason;
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

export const MODEL_PATTERN = /^[^:]+:.+$/;

export const ModelStringSchema = v.pipe(
  v.string(),
  v.regex(MODEL_PATTERN, "Must be in provider:model format (e.g. opencode:big-pickle)"),
);

export const ParsedModelSchema = v.pipe(
  ModelStringSchema,
  v.transform((s) => {
    const idx = s.indexOf(":");
    return { provider: s.slice(0, idx), model: s.slice(idx + 1) };
  }),
);

export type ParsedModel = v.InferOutput<typeof ParsedModelSchema>;

////////////////////////////////////////////////////////////////////////////////////

export function toModelString(provider: string, model: string): string {
  return `${provider}:${model}`;
}

export function parseModelString(s: string): Result<ParsedModel, ModelError> {
  const parsed = v.safeParse(ParsedModelSchema, s);

  if (!parsed.success) {
    return err(
      new ModelError({
        reason: "invalid-format",
        message: REASON_MESSAGES["invalid-format"],
        meta: { issues: parsed.issues },
      }),
    );
  }

  return ok(parsed.output);
}
