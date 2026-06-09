import { describe, expect, it } from "vitest";
import { normalizeLoginAccount, validateLoginAccount } from "./login-account";

describe("login account validation", () => {
  it("accepts admin as the only non-email account", () => {
    expect(validateLoginAccount("admin")).toEqual({ ok: true, account: "admin" });
    expect(validateLoginAccount(" Admin ")).toEqual({ ok: true, account: "admin" });
  });

  it("accepts email accounts", () => {
    expect(validateLoginAccount("operator@example.com")).toEqual({
      ok: true,
      account: "operator@example.com",
    });
  });

  it("rejects empty accounts", () => {
    expect(validateLoginAccount("  ")).toEqual({ ok: false, reason: "required" });
  });

  it("rejects non-admin non-email accounts", () => {
    expect(validateLoginAccount("operator")).toEqual({ ok: false, reason: "invalidEmail" });
    expect(validateLoginAccount("operator@example")).toEqual({ ok: false, reason: "invalidEmail" });
  });

  it("trims email accounts without changing case", () => {
    expect(normalizeLoginAccount(" User@Example.com ")).toBe("User@Example.com");
  });
});
