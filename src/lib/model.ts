import { err, ok, type Result } from "@justmiracle/result";
import * as v from "valibot";

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

export function toModelString(provider: string, model: string): string {
  return `${provider}:${model}`;
}

export function parseModelString(s: string): Result<ParsedModel, Error> {
  const parsed = v.safeParse(ParsedModelSchema, s);

  if (!parsed.success) {
    return err(new Error(parsed.issues[0]?.message ?? "Invalid model string"));
  }

  return ok(parsed.output);
}
