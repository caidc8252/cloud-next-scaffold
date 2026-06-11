import { defineAppManifest } from "@cloud/platform-config";

// admin 平台的菜单 / 权限定义（COC 单一真源，替代旧 sys_menu + sys_permission）。
// 三级约定：L1 目录(path:null) → L2/L3 叶子(有 path)。menuCode / permissionCode 平台内唯一。
// contractTypes: ["*"] 表示所有契约可见；否则仅列出的契约可见。
export const appManifest = defineAppManifest({
  // 本平台声明的契约类型；gen:manifest 跨 app 取并集 → 全局契约枚举（替代旧 _contracts.ts）。
  // 对齐目标 schema 的 ContractType（ISO/ISV → US-ISO/US-ISV）。
  contractKeys: ["ADMIN", "US-ISO", "US-ISV", "MERCHANT"],
  menus: [
    // ── Home ──────────────────────────────────────────────
    { menuCode: "home", menuTitle: "Home", parentMenuCode: null, path: null, contractTypes: ["*"], order: 1 },
    {
      menuCode: "dashboard",
      menuTitle: "Dashboard",
      parentMenuCode: "home",
      path: "/dashboard",
      icon: "layout-dashboard",
      contractTypes: ["*"],
      order: 2,
      permissions: [{ code: "dashboard:view", label: "View Dashboard", desc: "View dashboard" }],
    },

    // ── System ────────────────────────────────────────────
    { menuCode: "system", menuTitle: "System", parentMenuCode: null, path: null, icon: "settings", contractTypes: ["*"], order: 100 },
    {
      menuCode: "roles",
      menuTitle: "Roles",
      parentMenuCode: "system",
      path: "/system/roles",
      icon: "shield",
      contractTypes: ["ADMIN"],
      order: 101,
      permissions: [
        { code: "roles.VIEW", label: "View Roles", desc: "View role list and details" },
        { code: "roles.ADD", label: "Create Role", desc: "Create new role" },
        { code: "roles.UPD", label: "Edit Role", desc: "Edit role name, description, permissions" },
        { code: "roles.DELETE", label: "Delete Role", desc: "Delete non-builtin role" },
        { code: "roles.DUPLICATE", label: "Duplicate Role", desc: "Copy an existing role" },
      ],
    },
    {
      menuCode: "users",
      menuTitle: "Users",
      parentMenuCode: "system",
      path: "/system/users",
      icon: "users",
      contractTypes: ["*"],
      order: 102,
      permissions: [
        { code: "users.VIEW", label: "View Users", desc: "View user list and details" },
        { code: "users.ADD", label: "Create User", desc: "Create user (direct mode)" },
        { code: "users.INVITE", label: "Invite User", desc: "Invite user (email mode)" },
        { code: "users.UPD", label: "Edit User", desc: "Edit user display name, email, remark" },
        { code: "users.LOCK", label: "Lock User", desc: "Lock / unlock user account" },
        { code: "users.RESETPW", label: "Reset Password", desc: "Force-reset user password" },
        { code: "users.CHANGE_ROLE", label: "Change Role", desc: "Change user's assigned role" },
      ],
    },
  ],
});
