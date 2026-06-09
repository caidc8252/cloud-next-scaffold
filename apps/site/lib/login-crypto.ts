import { encryptRsaOaep } from "@cloud/security/client";
import { LOGIN_PUBLIC_KEY_PEM } from "./login-public-key";

export async function encryptLoginPassword(password: string, timestamp: number): Promise<string> {
  return encryptRsaOaep(JSON.stringify({ password, timestamp }), LOGIN_PUBLIC_KEY_PEM);
}
