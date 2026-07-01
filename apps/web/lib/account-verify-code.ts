import "server-only";

import { randomInt } from "node:crypto";
import { kv } from "@cloud/cache";
import { REDIS_NS, TTL } from "@cloud/cache/redis-core";

// 身份变更（改邮箱）的验证码：服务端生成、存 Redis 带 TTL、真校验。投递走 @cloud/mail
// （见 lib/email.sendVerifyCodeEmail）。key 规则：auth:verify:{userId}:{purpose}。
export type VerifyPurpose = "EMAIL_CURRENT" | "EMAIL_NEW";

const VERIFY_CODE_TTL_SECONDS = TTL.AUTH_VERIFY_CODE_SECONDS;
const codeKey = (userId: number, purpose: VerifyPurpose) => `${REDIS_NS.auth.verify}:${userId}:${purpose}`;

type VerifyEntry = { code: string; newEmail?: string };

/** 生成 6 位验证码并存 Redis（覆盖同 purpose 旧码）；返回明文供投递桩使用。 */
export async function issueVerifyCode(
  userId: number,
  purpose: VerifyPurpose,
  meta?: { newEmail?: string },
): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  const entry: VerifyEntry = { code, ...(meta?.newEmail ? { newEmail: meta.newEmail } : {}) };
  await kv.set(codeKey(userId, purpose), entry, VERIFY_CODE_TTL_SECONDS);
  return code;
}

export async function readVerifyCode(userId: number, purpose: VerifyPurpose): Promise<VerifyEntry | null> {
  return kv.get<VerifyEntry>(codeKey(userId, purpose));
}

export async function consumeVerifyCode(userId: number, purpose: VerifyPurpose): Promise<void> {
  await kv.del(codeKey(userId, purpose));
}
