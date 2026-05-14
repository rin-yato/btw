export function formatError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;

    if (
      msg.includes("401") ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("api key")
    ) {
      return `Authentication failed. Check your API key is correct.`;
    }

    if (
      msg.includes("402") ||
      msg.toLowerCase().includes("insufficient") ||
      msg.toLowerCase().includes("quota")
    ) {
      return `API quota exceeded. Check your billing plan or try a different provider.`;
    }

    if (
      msg.includes("429") ||
      msg.toLowerCase().includes("rate limit") ||
      msg.toLowerCase().includes("too many requests")
    ) {
      return `Rate limited. Wait a moment and try again.`;
    }

    if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) {
      return `Access denied. Your API key may not have permission for this model.`;
    }

    if (
      msg.includes("404") ||
      msg.toLowerCase().includes("not found") ||
      msg.toLowerCase().includes("model")
    ) {
      return `Model not found. Check the model name is correct.`;
    }

    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("fetch failed")
    ) {
      return `Network error. Check your internet connection and try again.`;
    }

    if (
      msg.toLowerCase().includes("timeout") ||
      msg.toLowerCase().includes("timed out")
    ) {
      return `Request timed out. The model took too long to respond.`;
    }

    return msg;
  }

  return String(err);
}
