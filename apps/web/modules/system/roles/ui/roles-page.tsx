import { requirePermissions } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";
import { selectPermissionGroups } from "@/manifest/select";
import { listRoles } from "../server/roles.service";
import { translateRoleLabels } from "@/lib/role-labels";
import type { PermissionGroup } from "@/lib/permission-catalog";
import { RolesBoard } from "./components/roles-board";

// 权限目录来自本平台 manifest（按当前公司持有的契约过滤）。
function loadPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  return selectPermissionGroups(contractTypes);
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
