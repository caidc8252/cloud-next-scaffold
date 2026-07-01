import { defineModule } from "@cloud/platform-config";

// users 模块唯一真源。旧 users 通配([]) → 合同归属移 catalog 显式枚举全部合同。动词 add→create。
export default defineModule({
  moduleCategory: "system",
  moduleName: "users",
  menuCode: "system.users",
  title: "menu.users",
  parentMenuCode: "system",
  icon: "users",
  order: 102,
  entry: { url: "/system/users" },
  permissions: [
    { code: "system.users.user.view",          belongToMenuCode: "system.users", label: "permission.usersView",          desc: "permission.usersViewDesc" },
    { code: "system.users.user.create",        belongToMenuCode: "system.users", label: "permission.usersCreate",        desc: "permission.usersCreateDesc" },
    { code: "system.users.user.invite",        belongToMenuCode: "system.users", label: "permission.usersInvite",        desc: "permission.usersInviteDesc" },
    { code: "system.users.user.update",        belongToMenuCode: "system.users", label: "permission.usersUpdate",        desc: "permission.usersUpdateDesc" },
    { code: "system.users.user.lock",          belongToMenuCode: "system.users", label: "permission.usersLock",          desc: "permission.usersLockDesc" },
    { code: "system.users.user.resetPassword", belongToMenuCode: "system.users", label: "permission.usersResetPassword", desc: "permission.usersResetPasswordDesc" },
    { code: "system.users.user.changeRole",    belongToMenuCode: "system.users", label: "permission.usersChangeRole",    desc: "permission.usersChangeRoleDesc" },
  ],
});
