import "server-only";

import type { RoleDef } from "@cloud/platform-config";
import { PRESET_ROLE_ID_MAX } from "@cloud/platform-config";
import type { Role } from "@/app/(dashboard)/system/_shared/types";

// Entity → VO 映射。权限码走 sys_role.permission_codes JSONB（List<string>）。
// role 与 contract 解耦后 VO 不再有 contractType。

export type RoleRow = {
  roleId: number;
  roleName: string;
  roleType: string;
  remark: string | null;
  updTime: Date;
  updUserId: number;
  permissionCodes: unknown;
};

/** permission_codes JSONB（List<string>）→ 字符串数组。 */
export function extractPermissionCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  return codes.filter((code): code is string => typeof code === "string");
}

/** DB PRIVATE 角色（sys_role 行）→ VO。 */
export function toClientRole(row: RoleRow, updaterName: string, operatorCount: number): Role {
  return {
    id: String(row.roleId),
    name: row.roleName,
    description: row.remark ?? "",
    // 内置/通用角色由 roleId ≤ PRESET_ROLE_ID_MAX 派生（死写 GLOBAL，不入库）；DB 动态角色 ≥ DB_ROLE_ID_MIN。
    builtin: row.roleId <= PRESET_ROLE_ID_MAX,
    operatorCount,
    permissions: extractPermissionCodes(row.permissionCodes),
    updatedAt: row.updTime.toISOString(),
    updatedBy: updaterName,
  };
}

/**
 * 死写 GLOBAL 角色（代码注册表 RoleDef）→ VO。无 DB 行：builtin、只读、updatedBy=system。
 * name/description 为 coc i18n key（builtin 角色），由展示端（RSC 页面）按 locale 翻译。
 */
export function toClientCodeRole(def: RoleDef, operatorCount: number): Role {
  return {
    id: String(def.roleId),
    name: def.roleName,
    description: def.remark,
    builtin: true,
    operatorCount,
    permissions: [...def.permissionCodes],
    updatedAt: "",
    updatedBy: "system",
  };
}
