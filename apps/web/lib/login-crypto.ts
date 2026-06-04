import { encryptRsaOaep } from "@cloud/security/client";
import { LOGIN_PUBLIC_KEY_PEM } from "./login-public-key";

/** 用写死的 dev 公钥加密 {password, timestamp}，输出 base64 密文。仅客户端调用。 */
export async function encryptLoginPassword(password: string, timestamp: number): Promise<string> {
  return encryptRsaOaep(JSON.stringify({ password, timestamp }), LOGIN_PUBLIC_KEY_PEM);
}
