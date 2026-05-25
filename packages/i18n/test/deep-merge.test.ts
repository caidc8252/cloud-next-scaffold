import { describe, expect, it } from "vitest";
import { deepMerge } from "../src/deep-merge.ts";

describe("deepMerge", () => {
  it("merges flat objects, right wins", () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("recursively merges nested plain objects", () => {
    expect(
      deepMerge(
        { auth: { login: { title: "EN title", submit: "Sign in" } } },
        { auth: { login: { title: "中文标题" } } },
      ),
    ).toEqual({
      auth: { login: { title: "中文标题", submit: "Sign in" } },
    });
  });

  it("overrides non-object value with object and vice versa", () => {
    expect(deepMerge({ a: "x" }, { a: { b: 1 } })).toEqual({ a: { b: 1 } });
    expect(deepMerge({ a: { b: 1 } }, { a: "x" })).toEqual({ a: "x" });
  });

  it("does not mutate inputs", () => {
    const base = { a: { b: 1 } };
    const override = { a: { c: 2 } };
    const out = deepMerge(base, override);
    expect(base).toEqual({ a: { b: 1 } });
    expect(override).toEqual({ a: { c: 2 } });
    expect(out).toEqual({ a: { b: 1, c: 2 } });
  });

  it("treats arrays as values, not merged", () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
  });
});
