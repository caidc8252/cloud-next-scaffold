import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM 对称加解密，用于可逆地保护 TOTP secret 等密钥材料（区别于 argon2 的单向哈希）。
// 密钥由调用方注入（32 字节、base64 编码），包不读 env —— 与 rsa.ts 同范式。
function loadKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("AES key must decode to 32 bytes (base64-encoded).");
  }
  return key;
}

/** 加密明文，返回 base64(iv ‖ authTag ‖ ciphertext)。每次随机 12 字节 IV。 */
export function encryptSecret(plaintext: string, keyBase64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadKey(keyBase64), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** 解密 encryptSecret 的产物；密文被篡改或密钥不匹配时抛错（GCM 校验失败）。 */
export function decryptSecret(payloadBase64: string, keyBase64: string): string {
  const raw = Buffer.from(payloadBase64, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", loadKey(keyBase64), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
