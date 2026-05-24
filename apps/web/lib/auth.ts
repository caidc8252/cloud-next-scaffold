import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@cloud/config";

const SESSION_COOKIE = "sid";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: number;
  entityId: number | null;
  expiresAt: number;
};

export type SessionMenu = {
  menuId: number;
  menuTitle: string;
  path: string | null;
  icon: string | null;
  sort: number;
  parentMenuId: number | null;
};

export type SessionRole = {
  roleId: number;
  roleName: string;
  roleType: string;
};

export type PartialSession = {
  id: number;
  username: string;
  displayName: string | null;
};

export type AuthenticatedSession = {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  status: string;
  entity: {
    entityId: number;
    entityName: string;
    contractDefineCode: string;
  };
  roles: SessionRole[];
  permissions: string[];
  menus: SessionMenu[];
};

async function getPrismaClient() {
  const { prisma } = await import("@cloud/db");
  return prisma;
}

function sign(payload: string) {
  return createHmac("sha256", getEnv().AUTH_SESSION_SECRET).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: number, entityId: number | null) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, encodeSession({ userId, entityId, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = decodeSession(token);
  if (!payload) return null;
  if (payload.entityId === null) return null;

  const prisma = await getPrismaClient();

  // 1. Load user, check active
  const user = await prisma.sysUser.findUnique({
    where: { userId: payload.userId },
  });
  if (!user || user.status !== "ACTIVE" || !user.username) return null;

  // 2. Verify entity membership
  const entityUser = await prisma.sysEntityUser.findUnique({
    where: {
      entityId_userId: {
        entityId: payload.entityId,
        userId: payload.userId,
      },
    },
  });
  if (!entityUser || entityUser.status !== "ACTIVE") return null;

  // 3. Load entity + its active contract
  const entity = await prisma.sysEntity.findUnique({
    where: { entityId: payload.entityId },
  });
  if (!entity || entity.status !== "ACTIVE") return null;

  const entityContract = await prisma.sysEntityContract.findFirst({
    where: {
      authorizedEntityId: payload.entityId,
      status: "ACTIVE",
    },
  });
  if (!entityContract) return null;

  const contractDefineCode = entityContract.authorizedContractDefineCode;

  // 4. Load roles for user in this entity
  const userRoles = await prisma.sysUserRole.findMany({
    where: { userId: payload.userId, entityId: payload.entityId },
    include: { role: true },
  });

  const roles: SessionRole[] = userRoles.map((ur) => ({
    roleId: ur.role.roleId,
    roleName: ur.role.roleName,
    roleType: ur.role.roleType,
  }));

  // 5. Aggregate permissions
  let permissions: string[];

  if (entityUser.authorizingType === "ADMIN") {
    // ADMIN gets all permissions under this contract's menus
    const allPerms = await prisma.sysPermission.findMany({
      where: { menu: { contractDefineCode } },
      select: { permissionCode: true },
    });
    permissions = allPerms.map((p) => p.permissionCode);
  } else {
    const roleIds = userRoles.map((ur) => ur.roleId);
    const rolePermissions = roleIds.length > 0
      ? await prisma.sysRolePermission.findMany({
          where: { roleId: { in: roleIds } },
          select: { permissionCode: true },
        })
      : [];
    permissions = [...new Set(rolePermissions.map((rp) => rp.permissionCode))];
  }

  // 6. Derive menus from permissions (for this contract)
  const permissionDetails = permissions.length > 0
    ? await prisma.sysPermission.findMany({
        where: { permissionCode: { in: permissions } },
        select: { permissionMenuId: true },
      })
    : [];

  const menuIds = [
    ...new Set(
      permissionDetails
        .map((p) => p.permissionMenuId)
        .filter((id): id is number => id !== null)
    ),
  ];

  // Fetch leaf menus (menus directly linked from permissions)
  const leafMenus: SessionMenu[] = menuIds.length > 0
    ? (await prisma.sysMenu.findMany({
        where: { menuId: { in: menuIds }, contractDefineCode, isVisible: true },
        orderBy: { sort: "asc" },
      })).map((m) => ({
        menuId: m.menuId, menuTitle: m.menuTitle, path: m.path,
        icon: m.icon, sort: m.sort, parentMenuId: m.parentMenuId,
      }))
    : [];

  // Fetch parent menus (for sidebar tree grouping)
  const parentIds = [...new Set(
    leafMenus.map((m) => m.parentMenuId).filter((id): id is number => id !== null),
  )];

  const parentMenus: SessionMenu[] = parentIds.length > 0
    ? (await prisma.sysMenu.findMany({
        where: { menuId: { in: parentIds }, isVisible: true },
        orderBy: { sort: "asc" },
      })).map((m) => ({
        menuId: m.menuId, menuTitle: m.menuTitle, path: m.path,
        icon: m.icon, sort: m.sort, parentMenuId: m.parentMenuId,
      }))
    : [];

  // Merge and deduplicate
  const menuMap = new Map<number, SessionMenu>();
  for (const m of [...parentMenus, ...leafMenus]) {
    if (!menuMap.has(m.menuId)) menuMap.set(m.menuId, m);
  }
  const menus = [...menuMap.values()].sort((a, b) => a.sort - b.sort);

  return {
    id: user.userId,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
    entity: {
      entityId: entity.entityId,
      entityName: entity.entityName,
      contractDefineCode,
    },
    roles,
    permissions,
    menus,
  };
});

export const getPartialSession = cache(async (): Promise<PartialSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = decodeSession(token);
  if (!payload) return null;

  const prisma = await getPrismaClient();
  const user = await prisma.sysUser.findUnique({
    where: { userId: payload.userId },
  });
  if (!user || user.status !== "ACTIVE" || !user.username) return null;

  return {
    id: user.userId,
    username: user.username,
    displayName: user.displayName,
  };
});

export async function upgradeSession(entityId: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const payload = decodeSession(token);
  if (!payload) return;

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, encodeSession({ userId: payload.userId, entityId, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function downgradeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const payload = decodeSession(token);
  if (!payload) return;

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, encodeSession({ userId: payload.userId, entityId: null, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function requireSession() {
  const session = await getSession();
  if (session) return session;

  const partial = await getPartialSession();
  if (!partial) {
    redirect("/api/auth/logout");
  }

  const prisma = await getPrismaClient();
  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: partial.id },
    select: { status: true },
  });

  const hasActive = entityUsers.some((eu) => eu.status === "ACTIVE");
  if (hasActive) {
    redirect("/select-entity");
  }

  await downgradeSession();
  redirect("/locked");
}
