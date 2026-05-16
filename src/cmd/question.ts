import { AiService } from "@/lib/ai";
import { AUTH_FILENAME, AuthService, getAuthDir } from "@/lib/auth";
import { CONFIG_FILENAME, ConfigService, getConfigDir } from "@/lib/config";
import { JsonStore } from "@/lib/json-store";

import { cancel, isCancel, multiline } from "@clack/prompts";
import { err, isErr, ok, type Result } from "@justmiracle/result";
import pc from "picocolors";

import { formatError } from "@/error";

export async function readQuestion(): Promise<Result<string, void>> {
  const question = await multiline({
    message: "Ask a question",
    placeholder: "Type your question…  (double Enter to submit)",
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return "Type a question or press Ctrl+C to exit";
      }
    },
  });

  if (isCancel(question)) {
    cancel("Cancelled");
    return err(undefined);
  }

  return ok(question);
}

async function streamAnswer(
  question: string,
  noThinking: boolean,
  modelOverride?: string,
): Promise<void> {
  const configService = new ConfigService(
    new JsonStore({ dir: getConfigDir(), filename: CONFIG_FILENAME }),
  );
  const authService = new AuthService(
    new JsonStore({ dir: getAuthDir(), filename: AUTH_FILENAME }),
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

export async function questionCmd(
  noThinking: boolean,
  modelOverride: string | undefined,
  question: string,
): Promise<void> {
  await streamAnswer(question, noThinking, modelOverride);
}

export async function promptCmd(
  noThinking: boolean,
  modelOverride: string | undefined,
): Promise<void> {
  const questionResult = await readQuestion();
  if (isErr(questionResult)) return;
  await streamAnswer(questionResult.value, noThinking, modelOverride);
}
