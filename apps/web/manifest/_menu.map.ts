import { defineAppManifest } from "@cloud/platform-config";

// admin 平台的菜单 / 权限定义（COC 单一真源，替代旧 sys_menu + sys_permission）。
// 三级约定：L1 目录(path:null) → L2/L3 叶子(有 path)。menuCode / permissionCode 全局唯一。
// menuTitle / label / desc 为 i18n key（相对 coc 命名空间）；权限码全小写 camel <域>.<动作>。
// contractTypes: [] 表示跨平台公共能力（所有契约/控制台可见，权限码进入每个 party scope）；否则仅列出的契约可见。
export const appManifest = defineAppManifest({
  // 本平台声明的契约类型；gen:manifest 跨 app 取并集 → 全局契约枚举。
  contractKeys: ["ADMIN", "US-ISO", "US-ISV", "MERCHANT"],
  menus: [
    // ── Home ──────────────────────────────────────────────
    { menuCode: "home", menuTitle: "menu.home", parentMenuCode: null, path: null, contractTypes: [], order: 1 },
    {
      menuCode: "dashboard",
      menuTitle: "menu.dashboard",
      parentMenuCode: "home",
      path: "/dashboard",
      icon: "layout-dashboard",
      // 通用（[]）+ 无 permissions：任何控制台、登录即可见。页面守卫用 requireSession()。
      contractTypes: [],
      order: 2,
    },

    // ── System ────────────────────────────────────────────
    { menuCode: "system", menuTitle: "menu.system", parentMenuCode: null, path: null, icon: "settings", contractTypes: [], order: 100 },
    {
      menuCode: "roles",
      menuTitle: "menu.roles",
      parentMenuCode: "system",
      path: "/system/roles",
      icon: "shield",
      contractTypes: ["ADMIN"],
      order: 101,
      permissions: [
        { code: "roles.view", label: "permission.rolesView", desc: "permission.rolesViewDesc", require: null },
        { code: "roles.add", label: "permission.rolesAdd", desc: "permission.rolesAddDesc", require: "roles.view" },
        { code: "roles.update", label: "permission.rolesUpdate", desc: "permission.rolesUpdateDesc", require: "roles.view" },
        { code: "roles.delete", label: "permission.rolesDelete", desc: "permission.rolesDeleteDesc", require: "roles.view" },
        { code: "roles.duplicate", label: "permission.rolesDuplicate", desc: "permission.rolesDuplicateDesc", require: "roles.view" },
      ],
    },
    {
      menuCode: "users",
      menuTitle: "menu.users",
      parentMenuCode: "system",
      path: "/system/users",
      icon: "users",
      // 跨平台公共能力（[]）：用户管理在各平台都可用，权限码进入每个 party scope。
      contractTypes: [],
      order: 102,
      permissions: [
        { code: "users.view", label: "permission.usersView", desc: "permission.usersViewDesc", require: null },
        { code: "users.add", label: "permission.usersAdd", desc: "permission.usersAddDesc", require: "users.view" },
        { code: "users.invite", label: "permission.usersInvite", desc: "permission.usersInviteDesc", require: "users.view" },
        { code: "users.update", label: "permission.usersUpdate", desc: "permission.usersUpdateDesc", require: "users.view" },
        { code: "users.lock", label: "permission.usersLock", desc: "permission.usersLockDesc", require: "users.view" },
        { code: "users.resetPassword", label: "permission.usersResetPassword", desc: "permission.usersResetPasswordDesc", require: "users.view" },
        { code: "users.changeRole", label: "permission.usersChangeRole", desc: "permission.usersChangeRoleDesc", require: "users.view" },
      ],
    },
  ],
});
