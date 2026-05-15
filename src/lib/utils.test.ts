import { describe, expect, test } from "bun:test";

import { mergeObjects } from "@/lib/utils";

describe("mergeObjects", () => {
  test("merges two objects", () => {
    const result = mergeObjects({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("later sources override earlier ones", () => {
    const result = mergeObjects({ a: 1, b: 2 }, { b: 3 });
    expect(result).toEqual({ a: 1, b: 3 });
  });

  test("ignores null and undefined sources", () => {
    const result = mergeObjects({ a: 1 }, null, undefined, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  test("works with a single object", () => {
    const result = mergeObjects({ a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  test("works with no sources", () => {
    const result = mergeObjects();
    expect(result).toEqual({});
  });

  test("preserves types with generic parameter", () => {
    interface Foo {
      a: number;
      b: number;
    }
    const result = mergeObjects<Foo>({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
