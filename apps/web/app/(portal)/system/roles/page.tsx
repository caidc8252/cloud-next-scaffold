import { prisma } from "@cloud/db";
import { requirePermissions } from "@cloud/permissions/server";
import { getPlatformManifest, PLATFORM_ID } from "@/manifest";
import { selectPermissionGroups } from "@/manifest/select";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { RolesPage } from "@/app/(portal)/system/roles/_components/roles-page";
import type { PermissionGroup } from "@/app/(portal)/system/_shared/types";

async function loadRoles(partnerId: number) {
  const roles = await prisma.sysRole.findMany({
    where: { OR: [{ partnerId }, { partnerId: null }] },
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

// 权限目录来自本平台 manifest（按当前公司持有的契约过滤），不再读 sys_menu/sys_permission。
function loadPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  const manifest = getPlatformManifest(PLATFORM_ID);
  if (!manifest) throw new Error(`[manifest] platform "${PLATFORM_ID}" not found`);
  return selectPermissionGroups(manifest, contractTypes).map((group) => ({
    menuId: group.menuCode,
    menuTitle: group.menuTitle,
    items: group.items,
  }));
}

export default async function SystemRolesPage() {
  const session = await requirePermissions({ all: ["roles.VIEW"] });
  const initialRoles = await loadRoles(session.currentPartnerId);
  const permissionGroups = loadPermissionGroups(session.contractTypes);
  return <RolesPage initialRoles={initialRoles} permissionGroups={permissionGroups} />;
}
