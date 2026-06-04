import { describe, expect, it } from "vitest";
import { generateKeyPairSync, publicEncrypt, constants } from "node:crypto";
import { decryptRsaOaep } from "../src/server/rsa.ts";
import { encryptRsaOaep } from "../src/client/rsa.ts";

function makeKeyPair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048, // 测试用 2048 提速；生产 dev 密钥用 4096
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
}

describe("decryptRsaOaep", () => {
  it("decrypts what was encrypted with the matching public key", () => {
    const { publicKey, privateKey } = makeKeyPair();
    const plaintext = JSON.stringify({ password: "ChangeMe!123", timestamp: 1700000000000 });
    const cipher = publicEncrypt(
      { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
      Buffer.from(plaintext, "utf8"),
    ).toString("base64");

    expect(JSON.parse(decryptRsaOaep(cipher, privateKey))).toEqual({
      password: "ChangeMe!123",
      timestamp: 1700000000000,
    });
  });

  it("throws on garbage ciphertext", () => {
    const { privateKey } = makeKeyPair();
    expect(() => decryptRsaOaep("not-base64-cipher", privateKey)).toThrow();
  });
});

describe("encryptRsaOaep ↔ decryptRsaOaep round-trip", () => {
  it("browser-side encrypt decrypts on server side", async () => {
    const { publicKey, privateKey } = makeKeyPair();
    const plaintext = JSON.stringify({ password: "p@ss-WORD-12", timestamp: 1700000000000 });

    const cipher = await encryptRsaOaep(plaintext, publicKey);
    expect(cipher).not.toContain("p@ss");

    expect(JSON.parse(decryptRsaOaep(cipher, privateKey))).toEqual({
      password: "p@ss-WORD-12",
      timestamp: 1700000000000,
    });
  });
});
