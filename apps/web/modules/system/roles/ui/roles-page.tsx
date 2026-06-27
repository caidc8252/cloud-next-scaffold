import { requirePermissions } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";
import { getMenus } from "@/manifest";
import { selectPermissionGroups } from "@/manifest/select";
import { listRoles } from "../server/roles.service";
import { translateRoleLabels } from "@/app/(dashboard)/system/_shared/role-labels";
import type { PermissionGroup } from "@/app/(dashboard)/system/_shared/types";
import { RolesBoard } from "./components/roles-board";

// 权限目录来自本平台 manifest（按当前公司持有的契约过滤）。
function loadPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  const menus = getMenus(contractTypes);
  return selectPermissionGroups(menus).map((group) => ({
    menuId: group.menuCode,
    menuTitle: group.menuTitle,
    items: group.items,
  }));
}

export async function RolesPage() {
  const session = await requirePermissions({ all: ["roles.view"] });
  const tc = await getTranslations("coc");
  const initialRoles = translateRoleLabels(
    await listRoles(session.currentPartyId, session.contractTypes),
    tc,
  );
  const permissionGroups = loadPermissionGroups(session.contractTypes);
  return <RolesBoard initialRoles={initialRoles} permissionGroups={permissionGroups} />;
}
