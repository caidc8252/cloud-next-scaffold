import { describe, expect, it } from "vitest";
import { parseAuthConfig } from "../src/auth.ts";

describe("parseAuthConfig", () => {
  it("uses defaults when only the private key is set", () => {
    const cfg = parseAuthConfig({ AUTH_LOGIN_RSA_PRIVATE_KEY: "pem" });
    expect(cfg).toEqual({
      maxPasswordErrorTimes: 6,
      lockDurationMinutes: 30,
      timestampWindowMs: 60_000,
      rsaPrivateKeyPem: "pem",
    });
  });

  it("coerces string overrides", () => {
    const cfg = parseAuthConfig({
      AUTH_LOGIN_RSA_PRIVATE_KEY: "pem",
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
