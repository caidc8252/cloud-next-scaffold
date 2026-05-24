import type { PermissionEntry } from "../types";

export const PERMISSION_CATALOG: PermissionEntry[] = [
  { code: "roles.VIEW", menuId: "m-admin-roles", label: "View Roles", desc: "View role list and details" },
  { code: "roles.ADD", menuId: "m-admin-roles", label: "Create Role", desc: "Create new role" },
  { code: "roles.UPD", menuId: "m-admin-roles", label: "Edit Role", desc: "Edit role name, description, permissions" },
  { code: "roles.DELETE", menuId: "m-admin-roles", label: "Delete Role", desc: "Delete non-builtin role" },
  { code: "roles.DUPLICATE", menuId: "m-admin-roles", label: "Duplicate Role", desc: "Copy an existing role" },
  { code: "users.VIEW", menuId: "m-admin-users", label: "View Users", desc: "View user list and details" },
  { code: "users.ADD", menuId: "m-admin-users", label: "Create User", desc: "Create user (direct mode)" },
  { code: "users.INVITE", menuId: "m-admin-users", label: "Invite User", desc: "Invite user (email mode, placeholder)" },
  { code: "users.UPD", menuId: "m-admin-users", label: "Edit User", desc: "Edit user display name, email, remark" },
  { code: "users.LOCK", menuId: "m-admin-users", label: "Lock/Unlock User", desc: "Lock / unlock user account" },
  { code: "users.RESETPW", menuId: "m-admin-users", label: "Reset Password", desc: "Force-reset user password" },
  { code: "users.CHANGE_ROLE", menuId: "m-admin-users", label: "Change Role", desc: "Change user's assigned role" },
];

export const PERM_BY_CODE = Object.fromEntries(PERMISSION_CATALOG.map((p) => [p.code, p]));

export const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map((p) => p.code);
