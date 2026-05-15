import {
  intro,
  select,
  password,
  outro,
  isCancel,
  cancel,
} from "@clack/prompts";
import { getProviders } from "@earendil-works/pi-ai";
import { updateConfig, readConfig } from "@/config";
import { setApiKey } from "@/auth";

export async function connectFlow(): Promise<void> {
  intro("Connect to an AI provider");

  const providers = getProviders();
  const providerOptions = providers.map((p) => ({
    value: p as string,
    label: p.charAt(0).toUpperCase() + p.slice(1),
  }));

  const provider = await select({
    message: "Choose a provider",
    options: providerOptions as any,
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

  const selectedProvider = provider as string;
  await updateConfig({ provider: selectedProvider });
  await setApiKey(selectedProvider, apiKey as string);

  const config = await readConfig();
  outro(
    `Connected to ${(provider as string).charAt(0).toUpperCase() + (provider as string).slice(1)}!` +
      (config?.model ? ` Model: ${config.model}` : ""),
  );
}
