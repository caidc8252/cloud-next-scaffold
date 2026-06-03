import { prisma } from "@cloud/db";
import { requirePermissions } from "@cloud/permissions/server";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { RolesPage } from "@/app/(portal)/system/roles/_components/roles-page";
import type { PermissionGroup } from "@/app/(portal)/system/_shared/types";
import { PageBody } from "@/app/(portal)/_components/page-body";

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

async function loadPermissionGroups(contractDefineCode: string): Promise<PermissionGroup[]> {
  const menus = await prisma.sysMenu.findMany({
    where: { contractDefineCode, isVisible: true },
    include: {
      permissions: {
        select: { permissionCode: true, label: true, remark: true },
      },
    },
    orderBy: { sort: "asc" },
  });

  return menus
    .filter((m) => m.permissions.length > 0)
    .map((m) => ({
      menuId: String(m.menuId),
      menuTitle: m.menuTitle,
      items: m.permissions.map((p) => ({
        code: p.permissionCode,
        label: p.label ?? p.permissionCode,
        desc: p.remark ?? "",
      })),
    }));
}

export default async function SystemRolesPage() {
  const session = await requirePermissions({ all: ["roles.VIEW"] });
  const [initialRoles, permissionGroups] = await Promise.all([
    loadRoles(session.entity.entityId),
    loadPermissionGroups(session.entity.contractDefineCode),
  ]);
  return (
    <PageBody>
      <RolesPage initialRoles={initialRoles} permissionGroups={permissionGroups} />
    </PageBody>
  );
}
