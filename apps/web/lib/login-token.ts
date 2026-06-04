import "server-only";

import { randomBytes } from "node:crypto";
import { kv } from "@cloud/cache";

const MFA_LOGIN_TTL_SECONDS = 300;
const mfaLoginKey = (token: string) => `mfa:login:${token}`;

/** 签发 MFA 临时登录 token：随机 256bit，存 Redis（5min TTL），仅记录 userId。 */
export async function createMfaLoginToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await kv.set(mfaLoginKey(token), { userId }, MFA_LOGIN_TTL_SECONDS);
  return token;
}
