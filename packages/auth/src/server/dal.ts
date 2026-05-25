import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  decodeSession,
  SESSION_COOKIE,
  type AuthenticatedSession,
  type PartialSession,
  type SessionMenu,
  type SessionPayload,
  type SessionRole,
} from "./session.ts";

async function getPrismaClient() {
  const { prisma } = await import("@cloud/db");
  return prisma;
}

function toSessionMenu(menu: {
  menuId: number;
  menuTitle: string;
  path: string | null;
  icon: string | null;
  sort: number;
  parentMenuId: number | null;
}): SessionMenu {
  return {
    menuId: menu.menuId,
    menuTitle: menu.menuTitle,
    path: menu.path,
    icon: menu.icon,
    sort: menu.sort,
    parentMenuId: menu.parentMenuId,
  };
}

async function readSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return decodeSession(token);
}

async function loadPartialSession(userId: number): Promise<PartialSession | null> {
  const prisma = await getPrismaClient();
  const user = await prisma.sysUser.findUnique({
    where: { userId },
  });
  if (!user || user.status !== "ACTIVE" || !user.username) return null;

  return {
    id: user.userId,
    username: user.username,
    displayName: user.displayName,
  };
}

async function loadPermissionsForEntityUser(input: {
  contractDefineCode: string;
  authorizingType: string;
  roleIds: number[];
}) {
  const prisma = await getPrismaClient();

  if (input.authorizingType === "ADMIN") {
    const allPermissions = await prisma.sysPermission.findMany({
      where: { menu: { contractDefineCode: input.contractDefineCode } },
      select: { permissionCode: true },
    });
    return allPermissions.map((permission) => permission.permissionCode);
  }

  if (input.roleIds.length === 0) return [];

  const rolePermissions = await prisma.sysRolePermission.findMany({
    where: { roleId: { in: input.roleIds } },
    select: { permissionCode: true },
  });

  return [...new Set(rolePermissions.map((permission) => permission.permissionCode))];
}

async function loadMenusForPermissions(input: {
  contractDefineCode: string;
  permissions: string[];
}): Promise<SessionMenu[]> {
  if (input.permissions.length === 0) return [];

  const prisma = await getPrismaClient();
  const permissionDetails = await prisma.sysPermission.findMany({
    where: { permissionCode: { in: input.permissions } },
    select: { permissionMenuId: true },
  });

  const leafMenuIds = [
    ...new Set(
      permissionDetails
        .map((permission) => permission.permissionMenuId)
        .filter((menuId): menuId is number => menuId !== null),
    ),
  ];

  if (leafMenuIds.length === 0) return [];

  const leafMenus = (
    await prisma.sysMenu.findMany({
      where: {
        menuId: { in: leafMenuIds },
        contractDefineCode: input.contractDefineCode,
        isVisible: true,
      },
      orderBy: { sort: "asc" },
    })
  ).map(toSessionMenu);

  const parentMenuIds = [
    ...new Set(
      leafMenus
        .map((menu) => menu.parentMenuId)
        .filter((menuId): menuId is number => menuId !== null),
    ),
  ];

  const parentMenus = parentMenuIds.length === 0
    ? []
    : (
        await prisma.sysMenu.findMany({
          where: { menuId: { in: parentMenuIds }, isVisible: true },
          orderBy: { sort: "asc" },
        })
      ).map(toSessionMenu);

  const menuMap = new Map<number, SessionMenu>();
  for (const menu of [...parentMenus, ...leafMenus]) {
    if (!menuMap.has(menu.menuId)) {
      menuMap.set(menu.menuId, menu);
    }
  }

  return [...menuMap.values()].sort((left, right) => left.sort - right.sort);
}

async function loadAuthenticatedSession(payload: SessionPayload): Promise<AuthenticatedSession | null> {
  if (payload.entityId === null) return null;

  const prisma = await getPrismaClient();

  const user = await prisma.sysUser.findUnique({
    where: { userId: payload.userId },
  });
  if (!user || user.status !== "ACTIVE" || !user.username) return null;

  const entityUser = await prisma.sysEntityUser.findUnique({
    where: {
      entityId_userId: {
        entityId: payload.entityId,
        userId: payload.userId,
      },
    },
    include: {
      entity: true,
    },
  });
  if (
    !entityUser ||
    entityUser.status !== "ACTIVE" ||
    entityUser.entity.status !== "ACTIVE"
  ) {
    return null;
  }

  const entityContract = await prisma.sysEntityContract.findFirst({
    where: {
      authorizedEntityId: payload.entityId,
      status: "ACTIVE",
    },
  });
  if (!entityContract) return null;

  const userRoles = await prisma.sysUserRole.findMany({
    where: { userId: payload.userId, entityId: payload.entityId },
    include: { role: true },
  });

  const roles: SessionRole[] = userRoles.map((userRole) => ({
    roleId: userRole.role.roleId,
    roleName: userRole.role.roleName,
    roleType: userRole.role.roleType,
  }));

  const permissions = await loadPermissionsForEntityUser({
    contractDefineCode: entityContract.authorizedContractDefineCode,
    authorizingType: entityUser.authorizingType,
    roleIds: userRoles.map((userRole) => userRole.roleId),
  });

  const menus = await loadMenusForPermissions({
    contractDefineCode: entityContract.authorizedContractDefineCode,
    permissions,
  });

  return {
    id: user.userId,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
    entity: {
      entityId: entityUser.entity.entityId,
      entityName: entityUser.entity.entityName,
      contractDefineCode: entityContract.authorizedContractDefineCode,
    },
    roles,
    permissions,
    menus,
  };
}

export const getSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const payload = await readSessionPayload();
  if (!payload) return null;

  return loadAuthenticatedSession(payload);
});

export const getPartialSession = cache(async (): Promise<PartialSession | null> => {
  const payload = await readSessionPayload();
  if (!payload) return null;

  return loadPartialSession(payload.userId);
});

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
    include: {
      entity: {
        select: { status: true },
      },
    },
  });

  const hasActive = entityUsers.some(
    (entityUser) =>
      entityUser.status === "ACTIVE" &&
      entityUser.entity.status === "ACTIVE",
  );

  if (hasActive) {
    redirect("/select-entity");
  }

  redirect("/locked");
}
