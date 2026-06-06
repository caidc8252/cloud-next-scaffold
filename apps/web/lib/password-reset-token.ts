import "server-only";

import { randomBytes } from "node:crypto";
import { kv } from "@cloud/cache";

// 重置密码 token 改存 Redis（替代 sys_password_reset_request 表）。沿用 login-token 的范式：
// 随机 256bit token，value 仅记录 userId，TTL 72h。消费端（设新密码）后续补，本期只签发。
const PASSWORD_RESET_TTL_SECONDS = 72 * 60 * 60;
const passwordResetKey = (token: string) => `pwreset:${token}`;

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await kv.set(passwordResetKey(token), { userId }, PASSWORD_RESET_TTL_SECONDS);
  return token;
}
