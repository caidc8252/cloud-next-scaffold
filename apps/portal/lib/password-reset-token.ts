import "server-only";

import { kv } from "@cloud/cache";
import { generateToken } from "@cloud/security/token";
import { REDIS_NS, TTL } from "@cloud/cache/redis-core";

// 重置密码一次性 token。key/value 形状是与 admin（管理员触发签发）共享的跨 app 契约：
// `auth:pwreset:{token}` = { userId, source }；两 app 写同一约定、portal 消费。256-bit 不可猜、一次性。
// TTL 按 source：自助找回短（60m，本侧签发）；管理员触发长（72h，admin 侧签发）。
export type ResetTokenSource = "self-service" | "admin";
type ResetTokenEntry = { userId: number; source: ResetTokenSource };

const SELF_SERVICE_TTL_SECONDS = TTL.AUTH_PW_RESET_SELF_SECONDS;
const tokenKey = (token: string) => `${REDIS_NS.auth.pwReset}:${token}`;

/** 自助找回签发（TTL 60m）。 */
export async function issueSelfServiceResetToken(userId: number): Promise<string> {
  const token = generateToken();
  await kv.set(
    tokenKey(token),
    { userId, source: "self-service" } satisfies ResetTokenEntry,
    SELF_SERVICE_TTL_SECONDS,
  );
  return token;
}

export async function readResetToken(token: string): Promise<ResetTokenEntry | null> {
  return (await kv.get<ResetTokenEntry>(tokenKey(token))) ?? null;
}

export async function consumeResetToken(token: string): Promise<void> {
  await kv.del(tokenKey(token));
}
