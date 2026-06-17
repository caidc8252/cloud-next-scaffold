import "server-only";

import { kv } from "@cloud/cache";
import { generateToken } from "@cloud/security/token";

const MFA_LOGIN_TTL_SECONDS = 300;
const mfaLoginKey = (token: string) => `AUTH:LOGIN-MFA:${token}`;

export type MfaLoginEntry = { userId: number; returnTo?: string };

// 密码已通过但 MFA 未通过时使用的短期票据；它不是登录 session，
// 只允许换取一次 MFA 校验结果，避免把密码阶段和完整登录态混在一起。
// returnTo（站内 onboarding 路径）随票据透传，使 MFA 通过后能跳回邀请页而非跨 host handoff。
export async function createMfaLoginToken(userId: number, returnTo?: string): Promise<string> {
  const token = generateToken();
  await kv.set(mfaLoginKey(token), { userId, ...(returnTo ? { returnTo } : {}) }, MFA_LOGIN_TTL_SECONDS);
  return token;
}

export async function readMfaLoginToken(token: string): Promise<MfaLoginEntry | null> {
  return (await kv.get<MfaLoginEntry>(mfaLoginKey(token))) ?? null;
}

export async function deleteMfaLoginToken(token: string): Promise<void> {
  await kv.del(mfaLoginKey(token));
}
