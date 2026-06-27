import { encryptRsaOaep } from "@cloud/security/client";

// 登录传输加密公钥：base64 编码的 SPKI 裸 DER，由 NEXT_PUBLIC_ 环境变量注入（构建期内联进客户端 bundle）。
// encryptRsaOaep 接受裸 base64 DER 字符串，直接透传即可；与根 .env 的 NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY 成对。
const PUBLIC_KEY_DER_BASE64 = process.env.NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY;

/** 用 env 注入的公钥加密 {password, timestamp}，输出 base64 密文。仅客户端调用。 */
export async function encryptLoginPassword(password: string, timestamp: number): Promise<string> {
  if (!PUBLIC_KEY_DER_BASE64) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY");
  }
  return encryptRsaOaep(JSON.stringify({ password, timestamp }), PUBLIC_KEY_DER_BASE64);
}
