import { prisma } from "@cloud/db";
import { requireSession } from "../../../../lib/auth";
import { toClientRole } from "../../../../lib/role-mapper";
import { RolesPage } from "@cloud/system";

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
    ? await prisma.sysUser.findMany({
        where: { userId: { in: updaterIds } },
        select: { userId: true, username: true },
      })
    : [];
  const updaterMap = new Map(updaters.map((u) => [u.userId, u.username]));

  return roles.map((r) => toClientRole(r, updaterMap.get(r.updUserId) ?? "system"));
}

export default async function SystemRolesPage() {
  const session = await requireSession();
  const initialRoles = await loadRoles(session.entity.entityId);
  return <RolesPage initialRoles={initialRoles} />;
}
