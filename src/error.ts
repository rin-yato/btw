import { AiError } from "@/lib/ai";
import { ConfigError } from "@/lib/config";
import { JsonStoreError } from "@/lib/json-store";

import { CliError } from "@/cli";
import { ConnectError } from "@/cmd/connect";

export function formatError(err: unknown): string {
  if (err instanceof JsonStoreError) {
    return `Configuration file error: ${err.message}`;
  }

  if (err instanceof ConfigError) {
    return `Configuration error: ${err.message}`;
  }

  if (err instanceof AiError) {
    switch (err.reason) {
      case "authentication":
        return "Authentication failed. Check your API key is correct.";
      case "quota":
        return "API quota exceeded. Check your billing plan or try a different provider.";
      case "rate-limit":
        return "Rate limited. Wait a moment and try again.";
      case "timeout":
        return "Request timed out. The model took too long to respond.";
      case "network":
        return "Network error. Check your internet connection and try again.";
      case "model-not-found":
        return "Model not found. Check the model name is correct.";
      default:
        return err.message;
    }
  }

  if (err instanceof ConnectError) {
    return err.message;
  }

  if (err instanceof CliError) {
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}
