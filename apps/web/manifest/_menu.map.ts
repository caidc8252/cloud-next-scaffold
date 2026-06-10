import { defineAppManifest } from "@cloud/platform-config";

// web 平台的菜单 / 权限定义（COC 单一真源，替代旧 sys_menu + sys_permission）。
// 三级约定：L1 目录(path:null) → L2/L3 叶子(有 path)。menuCode / permissionCode 平台内唯一。
// contractTypes: ["*"] 表示所有契约可见；否则仅列出的契约可见。
export const appManifest = defineAppManifest({
  // 本平台声明的契约类型；gen:manifest 跨 app 取并集 → 全局契约枚举（替代旧 _contracts.ts）。
  contractKeys: ["ADMIN", "ISO", "ISV", "MERCHANT"],
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

    // ── Storage ───────────────────────────────────────────
    // S3 上传是示例页，暂时从菜单隐藏（页面与 API 仍保留在仓库里）。需要时取消注释整组即可恢复；
    // s3Upload 是 storage 目录唯一子项，所以连父目录一起注释，避免「空目录」校验失败。
    // {
    //   menuCode: "storage", menuTitle: "Storage", parentMenuCode: null, path: null, icon: "database", contractTypes: ["*"], order: 200,
    // },
    // {
    //   menuCode: "s3Upload",
    //   menuTitle: "S3 Upload",
    //   parentMenuCode: "storage",
    //   path: "/storage/s3-upload",
    //   icon: "upload-cloud",
    //   contractTypes: ["*"],
    //   order: 201,
    //   permissions: [
    //     { code: "storage.VIEW", label: "View Storage", desc: "View uploaded S3 objects" },
    //     { code: "storage.UPLOAD", label: "Upload File", desc: "Upload files to S3" },
    //     { code: "storage.DOWNLOAD", label: "Download File", desc: "Download uploaded S3 objects" },
    //   ],
    // },
  ],
});
