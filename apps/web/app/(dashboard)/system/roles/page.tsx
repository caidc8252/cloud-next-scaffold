import { requirePermissions } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";
import { getMenus } from "@/manifest";
import { selectPermissionGroups } from "@/manifest/select";
import { listRoles } from "@/service/roles/server/roles.service";
import { RolesPage } from "@/app/(dashboard)/system/roles/_components/roles-page";
import { translateRoleLabels } from "@/app/(dashboard)/system/_shared/role-labels";
import type { PermissionGroup } from "@/app/(dashboard)/system/_shared/types";

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
  const session = await requirePermissions({ all: ["roles.view"] });
  const tc = await getTranslations("coc");
  const initialRoles = translateRoleLabels(
    await listRoles(session.currentPartyId, session.contractTypes),
    tc,
  );
  const permissionGroups = loadPermissionGroups(session.contractTypes);
  return <RolesPage initialRoles={initialRoles} permissionGroups={permissionGroups} />;
}
