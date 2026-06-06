import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptSecret, decryptSecret } from "./aes";

const key = randomBytes(32).toString("base64");

describe("aes secret crypto", () => {
  it("round-trips plaintext", () => {
    const plain = "JBSWY3DPEHPK3PXP";
    expect(decryptSecret(encryptSecret(plain, key), key)).toBe(plain);
  });

  it("uses a random IV so ciphertext differs each call", () => {
    expect(encryptSecret("same", key)).not.toBe(encryptSecret("same", key));
  });

  it("fails to decrypt with the wrong key (GCM auth)", () => {
    const enc = encryptSecret("secret", key);
    const otherKey = randomBytes(32).toString("base64");
    expect(() => decryptSecret(enc, otherKey)).toThrow();
  });

  it("rejects a key that is not 32 bytes", () => {
    expect(() => encryptSecret("x", "c2hvcnQ=")).toThrow();
  });
});
