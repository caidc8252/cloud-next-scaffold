import "server-only";

import { cookies } from "next/headers";
import {
  SID_COOKIE,
  SID_COOKIE_MAX_AGE_SECONDS,
  sessionStore,
  type Session,
} from "./session-store.ts";

// 会话快照由 app 层构建后传入；
// 这里只负责把 sid 写进 cookie、把快照落 / 删 Redis，不碰 manifest / DB。
export type SessionSnapshotInput = Omit<Session, "loginAt" | "expireAt">;

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

/** 新建会话：写 Redis 快照 + 下发 sid cookie。登录时调用。 */
export async function createSession(snapshot: SessionSnapshotInput): Promise<void> {
  const { sid } = await sessionStore.create(snapshot);
  const cookieStore = await cookies();
  cookieStore.set(SID_COOKIE, sid, cookieOptions());
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

/** 登出：删 Redis 快照 + 清 cookie。 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SID_COOKIE)?.value;
  if (sid) await sessionStore.destroy(sid);
  cookieStore.set(SID_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}
