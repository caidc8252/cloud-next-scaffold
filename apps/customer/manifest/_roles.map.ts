import { defineAppRoles } from "@cloud/platform-config";

// customer 平台的死写通用角色（GLOBAL，不入库）。roleId 区间：101–200。
// 预置超管（roleId 101）显式列出本组可达全部权限码；完整性由 pnpm check:roles 非阻断兜底。
// customer 无自有菜单，组内可达 = admin 侧跨平台公共能力 users.*（contractTypes:[]，进入每个 party scope）。
export const appRoles = defineAppRoles([
  {
    roleId: 101,
    roleName: "role.customerPresetAdmin",
    remark: "role.customerPresetAdminDesc",
    permissionCodes: [
      "users.view", "users.add", "users.invite", "users.update", "users.lock", "users.resetPassword", "users.changeRole",
    ],
  },
]);
