import { describe, expect, test } from "bun:test";
import { formatError } from "../error.ts";

describe("formatError", () => {
  test("formats 401 / unauthorized errors", () => {
    const msg = formatError(new Error("401 Unauthorized"));
    expect(msg).toContain("API key");
  });

  test("formats 'api key' error messages", () => {
    const msg = formatError(new Error("invalid api key"));
    expect(msg).toContain("API key");
  });

  test("formats rate limit errors", () => {
    const msg = formatError(new Error("429 Too Many Requests"));
    expect(msg).toContain("Rate limited");
  });

  test("formats 403 forbidden errors", () => {
    const msg = formatError(new Error("403 Forbidden"));
    expect(msg).toContain("Access denied");
  });

  test("formats model not found errors", () => {
    const msg = formatError(new Error("model 'foo' not found"));
    expect(msg).toContain("Model not found");
  });

  test("formats network errors", () => {
    const msg = formatError(new Error("fetch failed: ECONNREFUSED"));
    expect(msg).toContain("Network error");
  });

  test("formats timeout errors", () => {
    const msg = formatError(new Error("timeout of 10000ms exceeded"));
    expect(msg).toContain("timed out");
  });

  test("formats 402 / quota errors", () => {
    const msg = formatError(new Error("402 Payment Required"));
    expect(msg).toContain("quota exceeded");
  });

  test("passes through unknown errors", () => {
    const msg = formatError(new Error("Something weird happened"));
    expect(msg).toBe("Something weird happened");
  });

  test("handles non-Error values", () => {
    const msg = formatError("just a string");
    expect(msg).toBe("just a string");
  });

  test("handles null/undefined-like errors gracefully", () => {
    const msg = formatError(new Error("ECONNREFUSED"));
    expect(msg).toContain("Network error");
  });
});
