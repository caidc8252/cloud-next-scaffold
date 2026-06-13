import { defineAppRoles } from "@cloud/platform-config";

// admin 平台的死写通用角色（GLOBAL，不入库）。roleId 区间：1–100。
// permissionCodes 必须是本平台菜单声明过的 code；Administrator 留空 = 预置通配管理员（isPresetAdminRole），
// 会话注入当前 party 的 scope（不再靠 AuthorizingType 运行时全量）。
export const appRoles = defineAppRoles([
  { roleId: 1, roleName: "Administrator", permissionCodes: [] },
  { roleId: 2, roleName: "Operator", permissionCodes: ["roles.VIEW", "users.VIEW"] },
]);
