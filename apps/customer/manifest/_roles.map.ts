import { defineAppRoles } from "@cloud/platform-config";

// customer 平台的死写通用角色（GLOBAL，不入库）。roleId 区间：101–200。
// Customer Administrator 留空，靠 AuthorizingType=ADMIN 运行时全量；102+ 运营/只读预设待 customer 业务菜单补全后再加。
export const appRoles = defineAppRoles([
  { roleId: 101, roleName: "Customer Administrator", permissionCodes: [] },
]);
