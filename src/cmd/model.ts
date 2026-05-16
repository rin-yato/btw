import { AUTH_FILENAME, AuthService, getAuthDir } from "@/lib/auth";
import { CONFIG_FILENAME, ConfigService, getConfigDir } from "@/lib/config";
import { JsonStore } from "@/lib/json-store";
import { capitalize } from "@/lib/utils";

import { autocomplete, cancel, isCancel } from "@clack/prompts";
import { getModels, getProviders } from "@earendil-works/pi-ai";
import { isErr } from "@justmiracle/result";

export async function modelCmd(): Promise<void> {
  const configService = new ConfigService(
    new JsonStore({ dir: getConfigDir(), filename: CONFIG_FILENAME }),
  );
  const authService = new AuthService(
    new JsonStore({ dir: getAuthDir(), filename: AUTH_FILENAME }),
  );

  const providers = getProviders();

  const connected: string[] = [];
  for (const provider of providers) {
    const key = await authService.getApiKey(provider);
    if (isErr(key)) {
      process.stderr.write(`\nError: ${key.error.message}\n`);
      process.exit(1);
    }
    if (key.value) connected.push(provider);
  }

  if (connected.length === 0) {
    process.stderr.write(
      "\nNo providers connected. Use `btw connect` to add an API key first.\n",
    );
    process.exit(1);
  }

  const selectedProvider = await autocomplete({
    message: "Choose a provider",
    placeholder: "Start typing to search...",
    options: connected.map((p) => ({ value: p, label: capitalize(p) })),
  });

  if (isCancel(selectedProvider) || !selectedProvider) {
    cancel("Cancelled");
    process.exit(0);
  }

  const models = getModels(selectedProvider as never);

  if (models.length === 0) {
    process.stderr.write("\nNo models available for this provider.\n");
    process.exit(1);
  }

  const selectedModel = await autocomplete({
    message: `Choose a model from ${capitalize(selectedProvider)}`,
    placeholder: "Start typing to search...",
    options: models.map((m) => ({ value: m.id, label: m.id })),
  });

  if (isCancel(selectedModel) || !selectedModel) {
    cancel("Cancelled");
    process.exit(0);
  }

  const modelString = `${selectedProvider}:${selectedModel}`;

  const updateResult = await configService.updateConfig({ model: modelString });
  if (isErr(updateResult)) {
    process.stderr.write(`\nError: ${updateResult.error.message}\n`);
    process.exit(1);
  }

  console.log(`\nDefault model set to ${modelString}`);
}
