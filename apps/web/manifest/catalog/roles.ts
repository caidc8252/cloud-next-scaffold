// 死写 GLOBAL 角色(roleId ≤ 1000,不入库)。roleName/remark 为 i18n key。
// 角色列全量码;运行时按当前 party 合同 ∩ 出有效权限。PermissionCode 为可擦除类型导入(bootstrap)。
import type { PermissionCode } from "../_generated/registry-types.generated.ts";

export type GlobalRole = {
  roleId: number;
  roleName: string;
  remark: string;
  permissionCodes: PermissionCode[];
};

export const GLOBAL_ROLES: GlobalRole[] = [
  {
    roleId: 1,
    roleName: "role.adminPresetAdmin",
    remark: "role.adminPresetAdminDesc",
    permissionCodes: [
      "system.roles.role.view", "system.roles.role.create", "system.roles.role.update",
      "system.roles.role.delete", "system.roles.role.duplicate",
      "system.users.user.view", "system.users.user.create", "system.users.user.invite",
      "system.users.user.update", "system.users.user.lock", "system.users.user.resetPassword",
      "system.users.user.changeRole",
    ],
  },
  {
    roleId: 2,
    roleName: "role.adminOperator",
    remark: "role.adminOperatorDesc",
    permissionCodes: ["system.roles.role.view", "system.users.user.view"],
  },
];
