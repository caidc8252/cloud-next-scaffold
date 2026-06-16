import { defineAppRoles } from "@cloud/platform-config";

// admin 平台的死写通用角色（GLOBAL，不入库）。roleId 区间：1–100。
// 预置超管（roleId 1）显式列出本平台全部权限码（不再留空自动填充）；完整性由 pnpm check:roles 非阻断兜底。
// roleName / remark 为 i18n key（相对 coc）。
const ALL_ADMIN_CODES = [
  "roles.view", "roles.add", "roles.update", "roles.delete", "roles.duplicate",
  "users.view", "users.add", "users.invite", "users.update", "users.lock", "users.resetPassword", "users.changeRole",
];

export const appRoles = defineAppRoles([
  { roleId: 1, roleName: "role.adminPresetAdmin", remark: "role.adminPresetAdminDesc", permissionCodes: ALL_ADMIN_CODES },
  { roleId: 2, roleName: "role.adminOperator", remark: "role.adminOperatorDesc", permissionCodes: ["roles.view", "users.view"] },
]);
