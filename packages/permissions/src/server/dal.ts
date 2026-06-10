import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SID_COOKIE, sessionStore, type ActiveSession, type Session } from "./session-store.ts";

// 会话是单一扁平形状：getSession 直接返回快照（无投影/无重命名），
// 选定公司的会话用 ActiveSession 类型收窄（currentPartnerId 等保证非空）。
// menus 不在 session 里，由 apps/admin/lib/session-menus.ts 按 manifest 现算。

export type PartialSession = {
  userId: number;
  username: string;
  displayName: string | null;
};

async function readSid(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SID_COOKIE)?.value ?? null;
}

// 读 Redis 快照（按请求缓存）；命中即滑动续期。未命中 / 过期返回 null。
const readSnapshot = cache(async (): Promise<Session | null> => {
  const sid = await readSid();
  if (!sid) return null;

  const session = await sessionStore.read(sid);
  if (session) await sessionStore.touch(sid);
  return session;
});

export const getSession = cache(async (): Promise<ActiveSession | null> => {
  const session = await readSnapshot();
  if (!session || session.currentPartnerId === null) return null;
  // currentPartnerId 非空 ⇒ 当前公司字段已由快照构建器填充
  return session as ActiveSession;
});

export const getPartialSession = cache(async (): Promise<PartialSession | null> => {
  const session = await readSnapshot();
  if (!session) return null;
  return { userId: session.userId, username: session.username, displayName: session.displayName };
});

export async function requireSession(): Promise<ActiveSession> {
  const session = await getSession();
  if (session) return session;

  const snapshot = await readSnapshot();
  if (!snapshot) {
    redirect("/api/auth/logout");
  }

  // 有身份但未选公司跳转选择
  redirect("/select-partner");

}
