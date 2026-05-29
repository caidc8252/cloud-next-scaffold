import { describe, expect, it } from "vitest";
import {
  getPositiveIntegerSize,
  isContentHashInputPresent,
  normalizeContentHash,
} from "./storage-content-hash";

describe("normalizeContentHash", () => {
  it("normalizes SHA-256 hex digests", () => {
    expect(normalizeContentHash(` ${"A".repeat(64)} `)).toBe("a".repeat(64));
  });

  it("rejects invalid digests", () => {
    expect(normalizeContentHash("abc")).toBeNull();
    expect(normalizeContentHash("g".repeat(64))).toBeNull();
  });
});

describe("isContentHashInputPresent", () => {
  it("distinguishes blank values from invalid provided values", () => {
    expect(isContentHashInputPresent(" ")).toBe(false);
    expect(isContentHashInputPresent("abc")).toBe(true);
  });
});

describe("getPositiveIntegerSize", () => {
  it("normalizes positive sizes", () => {
    expect(getPositiveIntegerSize("12.8")).toBe(12);
  });

  it("rejects non-positive sizes", () => {
    expect(getPositiveIntegerSize("0")).toBeNull();
    expect(getPositiveIntegerSize(undefined)).toBeNull();
  });
});
