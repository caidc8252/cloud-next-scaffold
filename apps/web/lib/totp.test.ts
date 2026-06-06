import { describe, it, expect } from "vitest";
import { authenticator } from "otplib";
import { generateTotpSecret, verifyTotp, totpKeyUri } from "./totp";

describe("totp", () => {
  it("verifies a freshly generated code for its secret", () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotp(code, secret)).toBe(true);
  });

  it("rejects a code that doesn't match the secret", () => {
    const secret = generateTotpSecret();
    const valid = authenticator.generate(secret);
    const wrong = valid === "000000" ? "111111" : "000000";
    expect(verifyTotp(wrong, secret)).toBe(false);
  });

  it("does not throw on malformed input", () => {
    expect(verifyTotp("not-a-code", "not-a-secret")).toBe(false);
  });

  it("builds an otpauth:// URI", () => {
    const uri = totpKeyUri("admin@toms", "Cloud", generateTotpSecret());
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
  });
});
