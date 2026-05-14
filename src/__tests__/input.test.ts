import { describe, expect, test } from "bun:test";
import { CANCEL } from "@/input";

describe("CANCEL", () => {
  test("is a unique symbol", () => {
    expect(typeof CANCEL).toBe("symbol");
    expect(CANCEL).not.toBe(Symbol.for("cancel"));
  });
});
