import { cancel, isCancel, multiline } from "@clack/prompts";

export const CANCEL = Symbol("cancel");

export async function readQuestion(): Promise<string | typeof CANCEL> {
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
    return CANCEL;
  }

  return question;
}
