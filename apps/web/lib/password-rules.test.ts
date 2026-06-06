import { describe, it, expect } from "vitest";
import {
  meetsPasswordPolicy,
  recentPasswordHashes,
  buildNextPasswordHistory,
} from "./password-rules";

describe("meetsPasswordPolicy", () => {
  it("accepts a fully compliant password", () => {
    expect(meetsPasswordPolicy("NewCarbon@2027")).toBe(true);
  });
  it("rejects too short (< 12)", () => {
    expect(meetsPasswordPolicy("Ab1!xy")).toBe(false);
  });
  it("rejects when missing upper-case", () => {
    expect(meetsPasswordPolicy("newcarbon@2027")).toBe(false);
  });
  it("rejects when missing lower-case", () => {
    expect(meetsPasswordPolicy("NEWCARBON@2027")).toBe(false);
  });
  it("rejects when missing a digit", () => {
    expect(meetsPasswordPolicy("NewCarbon@@@@@")).toBe(false);
  });
  it("rejects when missing a symbol", () => {
    expect(meetsPasswordPolicy("NewCarbon2027xy")).toBe(false);
  });
});

describe("password history window", () => {
  it("recent hashes put the current hash first and cap at history size (5)", () => {
    expect(recentPasswordHashes("h0", ["h1", "h2", "h3", "h4", "h5"])).toEqual([
      "h0",
      "h1",
      "h2",
      "h3",
      "h4",
    ]);
  });
  it("next history prepends the previous hash and caps at 5", () => {
    expect(buildNextPasswordHistory("hp", ["h1", "h2", "h3", "h4", "h5"])).toEqual([
      "hp",
      "h1",
      "h2",
      "h3",
      "h4",
    ]);
  });
  it("handles empty history", () => {
    expect(buildNextPasswordHistory("hp", [])).toEqual(["hp"]);
  });
});
