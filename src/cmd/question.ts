import { AiService } from "@/lib/ai";
import { ConfigService } from "@/lib/config";
import { MarkdownRenderer, ThinkingRenderer } from "@/lib/markdown";
import { SessionService } from "@/lib/session";

import { cancel, isCancel, multiline } from "@clack/prompts";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { err, isErr, ok, type Result } from "@justmiracle/result";
import pc from "picocolors";
import { constant, isString, pipe, when } from "remeda";

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

type AnswerRenderer = Pick<MarkdownRenderer, "writeText" | "end">;
type ThinkingRendererLike = Pick<ThinkingRenderer, "start" | "write" | "end">;

export async function streamAnswer(
  question: string,
  noThinking: boolean,
  modelOverride?: string,
  renderers: {
    answer?: AnswerRenderer;
    thinking?: ThinkingRendererLike;
  } = {},
): Promise<void> {
  const configService = new ConfigService();
  const ai = new AiService();
  const sessions = new SessionService();

  const configResult = await configService.readConfig();
  if (isErr(configResult)) {
    process.stderr.write(`\n${pc.red("Error:")} ${configResult.error.message}\n`);
    process.exit(1);
  }

  const hideThinking = noThinking || !configResult.value.showThinking;

  const modelResult = await ai.getModelConfig(modelOverride);
  if (isErr(modelResult)) {
    process.stderr.write(`\n${pc.red("Error:")} ${modelResult.error.message}\n`);
    process.exit(1);
  }

  const sessionId = sessions.getSessionId(configResult.value.session ?? "global");
  const loadResult = await pipe(
    sessionId,
    when(isString, {
      onTrue: (id) => sessions.loadMessages(id),
      onFalse: constant(ok([] as AgentMessage[])),
    }),
  );

  if (isErr(loadResult)) {
    process.stderr.write(`\n${pc.red("Session error:")} ${loadResult.error.message}\n`);
  }
  const priorMessages = isErr(loadResult) ? [] : loadResult.value;

  const controller = new AbortController();
  process.on("SIGINT", () => controller.abort());

  const renderer = renderers.answer ?? new MarkdownRenderer();
  const thinkingRenderer = hideThinking
    ? undefined
    : (renderers.thinking ?? new ThinkingRenderer());

  const messages = await ai.streamQuestion(
    question,
    modelResult.value,
    (event) => {
      switch (event.type) {
        case "thinking_start":
          thinkingRenderer?.start();
          break;
        case "thinking":
          thinkingRenderer?.write(event.delta);
          break;
        case "thinking_end":
          thinkingRenderer?.end();
          break;
        case "text":
          renderer.writeText(event.delta);
          break;
        case "error":
          if (!controller.signal.aborted) {
            process.stderr.write(`\n${pc.red("Error:")} ${event.error.message}\n`);
            process.exit(1);
          }
      }
    },
    { signal: controller.signal, priorMessages },
  );

  renderer.end();

  if (sessionId) {
    const saveResult = await sessions.saveMessages(sessionId, messages);
    if (isErr(saveResult)) {
      process.stderr.write(`\n${pc.red("Session error:")} ${saveResult.error.message}\n`);
    }
  }
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
