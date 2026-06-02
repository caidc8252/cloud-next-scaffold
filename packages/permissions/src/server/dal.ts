import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SID_COOKIE, sessionStore, type Session, type SessionRole } from "./session-store.ts";

// getSession 返回的页面友好视图：从快照的 currentEntity 投影而来，
// 保留 id / entity.entityId / roles / permissions 等旧字段名，最小化消费方改动。
// contractDefineCode(单值) 已升级为 contractTypes(数组)；menus 不再在 session 里
// （由 apps/web/lib/session-menus.ts 按 manifest 现算）。
export type AuthenticatedSession = {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  email: string | null;
  status: string;
  entity: {
    entityId: number;
    entityName: string;
    contractTypes: string[];
  };
  roles: SessionRole[];
  permissions: string[];
};

export type PartialSession = {
  id: number;
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

function toAuthenticated(session: Session): AuthenticatedSession | null {
  const entity = session.currentEntity;
  if (!entity || session.currentEntityId === null) return null;

  return {
    id: session.userId,
    userId: session.userId,
    username: session.username,
    displayName: session.displayName,
    email: session.email,
    status: "ACTIVE",
    entity: {
      entityId: entity.entityId,
      entityName: entity.entityName,
      contractTypes: entity.contractTypes,
    },
    roles: entity.roles,
    permissions: entity.permissions,
  };
}

export const getSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const session = await readSnapshot();
  if (!session) return null;
  return toAuthenticated(session);
});

export const getPartialSession = cache(async (): Promise<PartialSession | null> => {
  const session = await readSnapshot();
  if (!session) return null;
  return { id: session.userId, username: session.username, displayName: session.displayName };
});

export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getSession();
  if (session) return session;

  const snapshot = await readSnapshot();
  if (!snapshot) {
    redirect("/api/auth/logout");
  }

  // 有身份但未选公司：有可用公司 → 选公司；否则锁定
  const hasActiveEntity = snapshot.entities.some((entity) => entity.status === "ACTIVE");
  if (hasActiveEntity) {
    redirect("/select-entity");
  }

  redirect("/locked");
}
