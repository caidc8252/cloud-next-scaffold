import { describe, expect, it } from "vitest";
import { normalizeLoginAccount, validateLoginAccount } from "./login-account";

describe("login account validation", () => {
  it("accepts email accounts", () => {
    expect(validateLoginAccount("operator@example.com")).toEqual({
      ok: true,
      account: "operator@example.com",
    });
  });

  it("rejects empty accounts", () => {
    expect(validateLoginAccount("  ")).toEqual({ ok: false, reason: "required" });
  });

  it("rejects non-email accounts (含旧用户名 admin)", () => {
    expect(validateLoginAccount("admin")).toEqual({ ok: false, reason: "invalidEmail" });
    expect(validateLoginAccount("operator")).toEqual({ ok: false, reason: "invalidEmail" });
    expect(validateLoginAccount("operator@example")).toEqual({ ok: false, reason: "invalidEmail" });
  });

  it("trims email accounts without changing case", () => {
    expect(normalizeLoginAccount(" User@Example.com ")).toBe("User@Example.com");
  });
});
