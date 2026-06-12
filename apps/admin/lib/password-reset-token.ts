import "server-only";

import { randomBytes } from "node:crypto";
import { kv } from "@cloud/cache";

// 重置密码 token：随机 256bit、Redis TTL 72h。key/value 形状是与 portal（消费端）共享的跨 app
// 契约：`pwreset:{token}` = { userId, source }；管理员触发 source="admin"。portal /reset-password 消费。
const PASSWORD_RESET_TTL_SECONDS = 72 * 60 * 60;
const passwordResetKey = (token: string) => `pwreset:${token}`;

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await kv.set(passwordResetKey(token), { userId, source: "admin" }, PASSWORD_RESET_TTL_SECONDS);
  return token;
}
