import { encryptRsaOaep } from "@cloud/security/client";

const PUBLIC_KEY_DER_BASE64 = process.env.NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY;

export async function encryptLoginPassword(
  password: string,
  timestamp: number,
  nonce: string,
): Promise<string> {
  if (!PUBLIC_KEY_DER_BASE64) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_LOGIN_RSA_PUBLIC_KEY");
  }
  return encryptRsaOaep(JSON.stringify({ password, timestamp, nonce }), PUBLIC_KEY_DER_BASE64);
}
