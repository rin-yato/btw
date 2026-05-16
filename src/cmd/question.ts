import { AiService } from "@/lib/ai";
import { AuthService, getAuthDir } from "@/lib/auth";
import { ConfigService, getConfigDir } from "@/lib/config";
import { JsonStore } from "@/lib/json-store";

import { isErr } from "@justmiracle/result";
import pc from "picocolors";

import { formatError } from "@/error";

export async function askQuestion(
  question: string,
  noThinking: boolean,
  modelOverride?: string,
): Promise<void> {
  const configService = new ConfigService(
    new JsonStore({ dir: getConfigDir(), filename: "config.json" }),
  );
  const authService = new AuthService(
    new JsonStore({ dir: getAuthDir(), filename: "auth.json" }),
  );
  const ai = new AiService(configService, authService);

  const configResult = await configService.readConfig();
  if (isErr(configResult)) {
    process.stderr.write(`\n${pc.red("Error:")} ${formatError(configResult.error)}\n`);
    process.exit(1);
  }

  const hideThinking = noThinking || !configResult.value.showThinking;

  const modelResult = await ai.getModelConfig(modelOverride);
  if (isErr(modelResult)) {
    process.stderr.write(`\n${pc.red("Error:")} ${formatError(modelResult.error)}\n`);
    process.exit(1);
  }

  const controller = new AbortController();
  process.on("SIGINT", () => controller.abort());

  const stream = ai.streamQuestion(question, modelResult.value, {
    signal: controller.signal,
  });

  for await (const event of stream) {
    if (event.type === "error") {
      if (controller.signal.aborted) {
        process.stdout.write("\n");
        return;
      }
      process.stderr.write(`\n${pc.red("Error:")} ${formatError(event.error)}\n`);
      process.exit(1);
    }
    if (event.type === "thinking" && !hideThinking) {
      process.stderr.write(pc.dim(event.delta));
    }
    if (event.type === "text") {
      process.stdout.write(event.delta);
    }
  }

  process.stdout.write("\n");
}
