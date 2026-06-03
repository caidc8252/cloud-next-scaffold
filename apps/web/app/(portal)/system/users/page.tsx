import { prisma } from "@cloud/db";
import { requirePermissions } from "@cloud/permissions/server";
import { toClientUser, USER_INCLUDE, collectAuxUserIds } from "@/app/(portal)/system/users/_server/user-mapper";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { UsersPage } from "@/app/(portal)/system/users/_components/users-page";
import { PageBody } from "@/app/(portal)/_components/page-body";

async function loadUsers(entityId: number) {
  const entityUserLinks = await prisma.sysEntityUser.findMany({
    where: { entityId },
    select: { userId: true },
  });
  const userIds = entityUserLinks.map((eu) => eu.userId);
  if (userIds.length === 0) return [];

  const rows = await prisma.sysUser.findMany({
    where: { userId: { in: userIds } },
    include: {
      ...USER_INCLUDE,
      entityUsers: { where: { entityId }, select: { authorizingType: true, status: true } },
      userRoles: { where: { entityId }, select: { roleId: true } },
    },
    orderBy: { creTime: "asc" },
  });

  const auxIds = collectAuxUserIds(rows);
  const auxUsers = auxIds.length > 0
    ? await prisma.sysUser.findMany({ where: { userId: { in: auxIds } }, select: { userId: true, username: true } })
    : [];
  const nameMap = new Map(auxUsers.map((u) => [u.userId, u.username ?? "system"]));

  return rows.map((r) => toClientUser(r, nameMap, nameMap));
}

async function loadRoles(entityId: number) {
  const roles = await prisma.sysRole.findMany({
    where: { OR: [{ entityId }, { entityId: null }] },
    include: {
      permissions: { select: { permissionCode: true } },
      _count: { select: { userRoles: true } },
    },
    orderBy: { creTime: "asc" },
  });

  const updaterIds = [...new Set(roles.map((r) => r.updUserId))];
  const updaters = updaterIds.length > 0
    ? await prisma.sysUser.findMany({ where: { userId: { in: updaterIds } }, select: { userId: true, username: true } })
    : [];
  const updaterMap = new Map(updaters.map((u) => [u.userId, u.username ?? "system"]));

  return roles.map((r) => toClientRole(r, updaterMap.get(r.updUserId) ?? "system"));
}

export default async function SystemUsersPage() {
  const session = await requirePermissions({ all: ["users.VIEW"] });
  const entityId = session.entity.entityId;
  const [initialUsers, initialRoles] = await Promise.all([
    loadUsers(entityId),
    loadRoles(entityId),
  ]);
  return (
    <PageBody>
      <UsersPage initialUsers={initialUsers} initialRoles={initialRoles} currentUserId={String(session.id)} />
    </PageBody>
  );
}
