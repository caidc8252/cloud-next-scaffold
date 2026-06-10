import "server-only";

import { randomBytes } from "node:crypto";
import { kv } from "@cloud/cache";

const MFA_LOGIN_TTL_SECONDS = 300;
const mfaLoginKey = (token: string) => `AUTH:LOGIN-MFA:${token}`;

// 密码已通过但 MFA 未通过时使用的短期票据；它不是登录 session，
// 只允许换取一次 MFA 校验结果，避免把密码阶段和完整登录态混在一起。
export async function createMfaLoginToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await kv.set(mfaLoginKey(token), { userId }, MFA_LOGIN_TTL_SECONDS);
  return token;
}

export async function readMfaLoginToken(token: string): Promise<number | null> {
  const entry = await kv.get<{ userId: number }>(mfaLoginKey(token));
  return entry?.userId ?? null;
}

export async function deleteMfaLoginToken(token: string): Promise<void> {
  await kv.del(mfaLoginKey(token));
}
