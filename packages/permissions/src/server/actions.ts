import "server-only";

import { cookies } from "next/headers";
import { generateToken } from "@cloud/security/token";
import { REDIS_NS, TTL } from "@cloud/cache/redis-core";
import { kv } from "@cloud/cache";
import {
  SID_COOKIE,
  SID_COOKIE_MAX_AGE_SECONDS,
  sessionStore,
  type Session,
} from "./session-store.ts";

// 会话快照由 app 层构建后传入；
// 这里只负责把 sid 写进 cookie、把快照落 / 删 Redis，不碰 manifest / DB。
export type SessionSnapshotInput = Omit<Session, "loginAt" | "expireAt">;

const HANDOFF_TTL_SECONDS = TTL.AUTH_SESSION_HANDOFF_SECONDS;
const handoffKey = (token: string) => `${REDIS_NS.auth.sessionHandoff}:${token}`;

type SessionHandoff = {
  sid: string;
  createdAt: number;
};

function cookieOptions() {
  const domain = process.env.SESSION_COOKIE_DOMAIN?.trim();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SID_COOKIE_MAX_AGE_SECONDS,
    ...(domain ? { domain } : {}),
  };
}

async function setSidCookie(sid: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SID_COOKIE, sid, cookieOptions());
}

/** 新建会话：写 Redis 快照 + 下发 sid cookie。登录时调用。 */
export async function createSession(snapshot: SessionSnapshotInput): Promise<string> {
  const { sid } = await sessionStore.create(snapshot);
  await setSidCookie(sid);
  return sid;
}

/** 覆盖当前 sid 的会话（选公司 / 退公司重算）；保留原 loginAt。无 sid 时静默 no-op。 */
export async function updateSession(snapshot: SessionSnapshotInput): Promise<void> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SID_COOKIE)?.value;
  if (!sid) return;

  const existing = await sessionStore.read(sid);
  const loginAt = existing?.loginAt ?? Date.now();
  await sessionStore.update(sid, { ...snapshot, loginAt });
}

/**
 * 为跨 host 应用切换签发一次性会话交接 token。
 *
 * Codespaces 这类环境会把不同端口暴露成不同子域，浏览器不会携带 host-only
 * cookie；也不应把 sid cookie 放大到整个公共开发域。交接 token 只在 Redis
 * 中短暂保存 sid，目标 app 消费后在自己的 host 下重新写同一个 sid cookie。
 */
export async function createSessionHandoffToken(sid?: string): Promise<string | null> {
  let currentSid = sid;
  if (!currentSid) {
    const cookieStore = await cookies();
    currentSid = cookieStore.get(SID_COOKIE)?.value;
  }
  if (!currentSid) return null;

  const session = await sessionStore.read(currentSid);
  if (!session) return null;

  const token = generateToken();
  await kv.set(
    handoffKey(token),
    { sid: currentSid, createdAt: Date.now() } satisfies SessionHandoff,
    HANDOFF_TTL_SECONDS,
  );
  return token;
}

/** 消费一次性会话交接 token，并在当前 app host 下写入 sid cookie。 */
export async function consumeSessionHandoffToken(token: string): Promise<boolean> {
  const handoff = await kv.get<SessionHandoff>(handoffKey(token));
  await kv.del(handoffKey(token));
  if (!handoff) return false;

  const session = await sessionStore.read(handoff.sid);
  if (!session) return false;

  await setSidCookie(handoff.sid);
  await sessionStore.touch(handoff.sid);
  return true;
}

/** 登出：删 Redis 快照 + 清 cookie。 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SID_COOKIE)?.value;
  if (sid) await sessionStore.destroy(sid);
  cookieStore.set(SID_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
