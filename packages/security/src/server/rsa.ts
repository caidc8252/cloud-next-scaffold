import "server-only";

import { privateDecrypt, constants } from "node:crypto";

/** 用 RSA 私钥（PKCS#8 PEM）解 base64 密文，OAEP + SHA-256。密钥由调用方注入，包不读 env。 */
export function decryptRsaOaep(ciphertextBase64: string, privateKeyPem: string): string {
  const decrypted = privateDecrypt(
    { key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(ciphertextBase64, "base64"),
  );
  return decrypted.toString("utf8");
}
