import { prisma } from "@cloud/db";
import { requirePermissions } from "@cloud/permissions/server";
import {
  toClientUser,
  toClientInvite,
  extractRoleIds,
  userPartnerInclude,
} from "@/app/(portal)/system/users/_server/user-mapper";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { UsersPage } from "@/app/(portal)/system/users/_components/users-page";

async function loadUsers(partnerId: number) {
  const partnerUserLinks = await prisma.sysPartnerUser.findMany({
    where: { partnerId, status: { in: ["ACTIVE", "LOCKED"] } },
    select: { userId: true },
  });
  const userIds = partnerUserLinks.map((eu) => eu.userId);
  const rows = userIds.length
    ? await prisma.sysUser.findMany({
        where: { userId: { in: userIds } },
        include: userPartnerInclude(partnerId),
        orderBy: { creTime: "asc" },
      })
    : [];

  const invites = await prisma.sysOperatorInvite.findMany({
    where: { partnerId, status: "PENDING" },
    orderBy: { creTime: "desc" },
  });
  const inviterIds = [...new Set(invites.map((inv) => inv.inviterUserId))];
  const inviters = inviterIds.length
    ? await prisma.sysUser.findMany({
        where: { userId: { in: inviterIds } },
        select: { userId: true, username: true },
      })
    : [];
  const inviterMap = new Map(inviters.map((u) => [u.userId, u.username]));

  return [
    ...rows.map((r) => toClientUser(r)),
    ...invites.map((inv) => toClientInvite(inv, inviterMap.get(inv.inviterUserId) ?? "system")),
  ];
}

async function loadRoles(partnerId: number) {
  const roles = await prisma.sysRole.findMany({
    where: { OR: [{ partnerId }, { partnerId: null }] },
    orderBy: { creTime: "asc" },
  });

  const links = await prisma.sysPartnerUser.findMany({
    where: { partnerId, status: { in: ["ACTIVE", "LOCKED"] } },
    select: { roles: true },
  });
  const counts = new Map<number, number>();
  for (const link of links) {
    for (const roleId of extractRoleIds(link.roles)) {
      const id = Number(roleId);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const updaterIds = [...new Set(roles.map((r) => r.updUserId))];
  const updaters = updaterIds.length > 0
    ? await prisma.sysUser.findMany({ where: { userId: { in: updaterIds } }, select: { userId: true, username: true } })
    : [];
  const updaterMap = new Map(updaters.map((u) => [u.userId, u.username ?? "system"]));

  return roles.map((r) =>
    toClientRole(r, updaterMap.get(r.updUserId) ?? "system", counts.get(r.roleId) ?? 0),
  );
}

export default async function SystemUsersPage() {
  const session = await requirePermissions({ all: ["users.VIEW"] });
  const partnerId = session.currentPartnerId;
  const [initialUsers, initialRoles] = await Promise.all([
    loadUsers(partnerId),
    loadRoles(partnerId),
  ]);
  return <UsersPage initialUsers={initialUsers} initialRoles={initialRoles} currentUserId={String(session.userId)} />;
}
