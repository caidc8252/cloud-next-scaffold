import { describe, expect, it } from "vitest";
import { parseAuthConfig } from "../src/auth.ts";

describe("parseAuthConfig", () => {
  it("decodes the base64 DER private key", () => {
    const cfg = parseAuthConfig({
      NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY: "ZGVyLWtleQ==",
      NEXT_AUTH_AES_SECRET_KEY: "mfa-key",
    });
    expect(cfg).toEqual({
      rsaPrivateKey: { key: Buffer.from("ZGVyLWtleQ==", "base64"), format: "der", type: "pkcs8" },
      aesSecretKey: "mfa-key",
    });
  });

  it("throws when the private key is missing", () => {
    expect(() => parseAuthConfig({})).toThrow();
  });
});
