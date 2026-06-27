import "server-only";

import { kv } from "@cloud/cache";
import { generateToken } from "@cloud/security/token";
import { REDIS_NS, TTL } from "@cloud/cache/redis-core";

// 重置密码 token：随机 256bit、Redis TTL 72h。key/value 形状是与 portal（消费端）共享的跨 app
// 契约：`auth:pwreset:{token}` = { userId, source }；管理员触发 source="admin"。portal /reset-password 消费。
const PASSWORD_RESET_TTL_SECONDS = TTL.AUTH_PW_RESET_ADMIN_SECONDS;
const passwordResetKey = (token: string) => `${REDIS_NS.auth.pwReset}:${token}`;

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = generateToken();
  await kv.set(passwordResetKey(token), { userId, source: "admin" }, PASSWORD_RESET_TTL_SECONDS);
  return token;
}
