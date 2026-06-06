import "server-only";

import { randomInt } from "node:crypto";
import { kv } from "@cloud/cache";

// 身份变更（邮箱 / 用户名）的验证码：服务端生成、存 Redis 带 TTL、真校验。
// "投递" 目前是 TODO 桩 —— 把验证码打到日志，后续接入邮件服务器后替换 deliverVerifyCode。
// key 规则：ACCOUNT:VERIFY:{userId}:{purpose}。

export type VerifyPurpose = "EMAIL_CURRENT" | "EMAIL_NEW" | "USERNAME_CURRENT";

const TTL_SECONDS = 600;
const codeKey = (userId: number, purpose: VerifyPurpose) => `ACCOUNT:VERIFY:${userId}:${purpose}`;

type VerifyEntry = { code: string; newEmail?: string };

/** 生成 6 位验证码并存 Redis（覆盖同 purpose 旧码）；返回明文供投递桩使用。 */
export async function issueVerifyCode(
  userId: number,
  purpose: VerifyPurpose,
  meta?: { newEmail?: string },
): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  const entry: VerifyEntry = { code, ...(meta?.newEmail ? { newEmail: meta.newEmail } : {}) };
  await kv.set(codeKey(userId, purpose), entry, TTL_SECONDS);
  return code;
}

/** TODO(email): 接入邮件服务器前，验证码仅打到日志。 */
export function deliverVerifyCode(address: string, purpose: VerifyPurpose, code: string): void {
  console.info(`[account/verify-code] purpose=${purpose} to=${address} code=${code}`);
}

export async function readVerifyCode(userId: number, purpose: VerifyPurpose): Promise<VerifyEntry | null> {
  return kv.get<VerifyEntry>(codeKey(userId, purpose));
}

export async function consumeVerifyCode(userId: number, purpose: VerifyPurpose): Promise<void> {
  await kv.del(codeKey(userId, purpose));
}
