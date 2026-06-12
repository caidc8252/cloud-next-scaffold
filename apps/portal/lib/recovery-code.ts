import "server-only";

import { randomInt } from "node:crypto";
import { kv } from "@cloud/cache";

// 忘记密码验证码：用户未登录，按 email 存（非 userId）。服务端生成 6 位、存 Redis 带 TTL、真校验。
// 投递走 @cloud/mail（lib/email.sendVerifyCodeEmail，intent=passwordRecovery）。
const TTL_SECONDS = 600; // 10 分钟，与邮件文案一致
const codeKey = (email: string) => `AUTH:RECOVERY:${email.trim().toLowerCase()}`;

export async function issueRecoveryCode(email: string): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  await kv.set(codeKey(email), { code }, TTL_SECONDS);
  return code;
}

/** 校验但不消费（供 verify-code 步做 UX 预检）。 */
export async function isRecoveryCodeValid(email: string, code: string): Promise<boolean> {
  const entry = await kv.get<{ code: string }>(codeKey(email));
  return entry?.code === code;
}

export async function consumeRecoveryCode(email: string): Promise<void> {
  await kv.del(codeKey(email));
}
