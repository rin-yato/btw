import type { AuthService } from "@/lib/auth";
import { capitalize } from "@/lib/utils";

import { autocomplete, cancel, intro, isCancel, outro, password } from "@clack/prompts";
import { getProviders } from "@earendil-works/pi-ai";
import { err, isErr, ok, type Result } from "@justmiracle/result";

///////////////////////////////////////////////////////////////////////////////////////////////////////////
const REASON_MESSAGES = {
  "store-error": "Failed to save configuration or API key",
} as const;

type ConnectErrorReason = keyof typeof REASON_MESSAGES;

export class ConnectError extends Error {
  declare readonly reason: ConnectErrorReason;
  declare readonly meta: Record<string, unknown>;

  constructor(opts: {
    reason: ConnectErrorReason;
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////

export async function connectCmd(auth: AuthService): Promise<Result<void, ConnectError>> {
  intro("Connect to an AI provider");

  const providers = getProviders();
  const providerOptions = providers.map((provider) => ({
    value: provider as string,
    label: capitalize(provider),
  }));

  const provider = await autocomplete({
    message: "Choose a provider",
    placeholder: "Start typing to search...",
    options: providerOptions,
  });

  if (isCancel(provider)) {
    cancel("Setup cancelled");
    process.exit(0);
  }

  const apiKey = await password({
    message: "Enter your API key",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "API key is required";
    },
  });

  if (isCancel(apiKey)) {
    cancel("Setup cancelled");
    process.exit(0);
  }

  const selectedProvider = provider;

  const keyResult = await auth.setApiKey(selectedProvider, apiKey);
  if (isErr(keyResult)) {
    return err(
      new ConnectError({
        reason: "store-error",
        message: REASON_MESSAGES["store-error"],
        cause: keyResult.error,
      }),
    );
  }

  outro(
    `Connected to ${capitalize(selectedProvider)}! You can now start using the models from this provider.`,
  );

  return ok(undefined);
}
