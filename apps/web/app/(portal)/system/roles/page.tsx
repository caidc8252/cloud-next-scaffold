import { prisma } from "@cloud/db";
import { requirePermissions } from "@cloud/permissions/server";
import { getMenus } from "@/manifest";
import { selectPermissionGroups } from "@/manifest/select";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { extractRoleIds } from "@/app/(portal)/system/users/_server/user-mapper";
import { RolesPage } from "@/app/(portal)/system/roles/_components/roles-page";
import type { PermissionGroup } from "@/app/(portal)/system/_shared/types";
import { PageBody } from "@/app/(portal)/_components/page-body";

async function loadRoles(partnerId: number) {
  const roles = await prisma.sysRole.findMany({
    where: { OR: [{ partnerId }, { partnerId: null }] },
    orderBy: { creTime: "asc" },
  });

  // 角色绑定走 sys_partner_user.roles JSONB，按当前 partner 统计每个角色的绑定用户数。
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
    ? await prisma.sysUser.findMany({
        where: { userId: { in: updaterIds } },
        select: { userId: true, username: true },
      })
    : [];
  const updaterMap = new Map(updaters.map((u) => [u.userId, u.username]));

  return roles.map((r) =>
    toClientRole(r, updaterMap.get(r.updUserId) ?? "system", counts.get(r.roleId) ?? 0),
  );
}

// 权限目录来自本平台 manifest（按当前公司持有的契约过滤），不再读 sys_menu/sys_permission。
function loadPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  const menus = getMenus(contractTypes);
  return selectPermissionGroups(menus).map((group) => ({
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
