import "server-only";

import { privateDecrypt, constants } from "node:crypto";

/** RSA 私钥入参：PKCS#8 PEM 字符串，或裸 DER（pkcs8 / pkcs1）。密钥由调用方注入，包不读 env。 */
export type PrivateKeyInput =
  | string
  | { key: Buffer; format: "der"; type: "pkcs8" | "pkcs1" };

/** 用 RSA 私钥解 base64 密文，OAEP + SHA-256。 */
export function decryptRsaOaep(ciphertextBase64: string, privateKey: PrivateKeyInput): string {
  const keyOptions = typeof privateKey === "string" ? { key: privateKey } : privateKey;
  const decrypted = privateDecrypt(
    { ...keyOptions, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(ciphertextBase64, "base64"),
  );
  return decrypted.toString("utf8");
}
