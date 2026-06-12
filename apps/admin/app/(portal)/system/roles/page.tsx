import { requirePermissions } from "@cloud/permissions/server";
import { getMenus } from "@/manifest";
import { selectPermissionGroups } from "@/manifest/select";
import { listRoles } from "@/service/roles/server/roles.service";
import { RolesPage } from "@/app/(portal)/system/roles/_components/roles-page";
import type { PermissionGroup } from "@/app/(portal)/system/_shared/types";

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
  const initialRoles = await listRoles(session.currentPartyId, session.contractTypes);
  const permissionGroups = loadPermissionGroups(session.contractTypes);
  return <RolesPage initialRoles={initialRoles} permissionGroups={permissionGroups} />;
}
