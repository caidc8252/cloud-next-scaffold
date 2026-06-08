import { describe, expect, it } from "vitest";
import { parseAuthConfig } from "../src/auth.ts";

describe("parseAuthConfig", () => {
  it("decodes the base64 DER private key and uses defaults for the rest", () => {
    const cfg = parseAuthConfig({ AUTH_LOGIN_RSA_PRIVATE_KEY: "ZGVyLWtleQ==", AUTH_MFA_SECRET_KEY: "mfa-key" });
    expect(cfg).toEqual({
      maxPasswordErrorTimes: 6,
      lockDurationMinutes: 30,
      timestampWindowMs: 60_000,
      rsaPrivateKey: { key: Buffer.from("ZGVyLWtleQ==", "base64"), format: "der", type: "pkcs8" },
      mfaSecretKey: "mfa-key",
    });
  });

  it("coerces string overrides", () => {
    const cfg = parseAuthConfig({
      AUTH_LOGIN_RSA_PRIVATE_KEY: "ZGVyLWtleQ==",
      AUTH_MFA_SECRET_KEY: "mfa-key",
      AUTH_PASSWORD_MAX_ERROR_TIMES: "10",
      AUTH_PASSWORD_LOCK_MINUTES: "15",
      AUTH_LOGIN_TIMESTAMP_WINDOW_SECONDS: "120",
    });
    expect(cfg.maxPasswordErrorTimes).toBe(10);
    expect(cfg.lockDurationMinutes).toBe(15);
    expect(cfg.timestampWindowMs).toBe(120_000);
  });

  it("throws when the private key is missing", () => {
    expect(() => parseAuthConfig({})).toThrow();
  });
});
