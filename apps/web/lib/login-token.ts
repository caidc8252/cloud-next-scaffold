import "server-only";

import { randomBytes } from "node:crypto";
import { kv } from "@cloud/cache";

// 登录第二阶段（MFA）的临时 token：随机 256bit 作 key（不可猜），值仅记录 userId，
// 5min TTL。key 形如 AUTH:LOGIN-MFA:{token}。校验成功后调用方显式删除（单次使用）；
// 验证码错误不删，留给重试（爆破由 SysMfaInfo.failTimes 锁定兜底）。
const MFA_LOGIN_TTL_SECONDS = 300;
const mfaLoginKey = (token: string) => `AUTH:LOGIN-MFA:${token}`;

/** 签发 MFA 临时登录 token：随机 256bit，存 Redis（5min TTL），仅记录 userId。 */
export async function createMfaLoginToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await kv.set(mfaLoginKey(token), { userId }, MFA_LOGIN_TTL_SECONDS);
  return token;
}

/** 读取 token 对应的 userId（不删除）；不存在/过期返回 null。 */
export async function readMfaLoginToken(token: string): Promise<number | null> {
  const entry = await kv.get<{ userId: number }>(mfaLoginKey(token));
  return entry?.userId ?? null;
}

/** 消费（删除）token —— 仅在 MFA 校验成功、正式会话建立后调用。 */
export async function deleteMfaLoginToken(token: string): Promise<void> {
  await kv.del(mfaLoginKey(token));
}
