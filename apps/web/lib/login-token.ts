import "server-only";

import { randomBytes } from "node:crypto";
import { kv } from "@cloud/cache";

// web 的公开登录路由已迁到 portal；该 helper 仍保留给 auth.service 顶层依赖，
// 避免后台内 select-partner route 构建时因历史 login/MFA 编排导入失败。
const MFA_LOGIN_TTL_SECONDS = 300;
const mfaLoginKey = (token: string) => `AUTH:LOGIN-MFA:${token}`;

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
