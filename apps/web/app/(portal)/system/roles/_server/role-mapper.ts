import "server-only";

import type { Role } from "@/app/(portal)/system/_shared/types";

type RoleRow = {
  roleId: number;
  roleName: string;
  roleType: string;
  contractType: string;
  remark: string | null;
  updTime: Date;
  updUserId: number;
  permissionCodes: unknown;
};

/** permission_codes JSONB（List<string>）→ 字符串数组。 */
export function extractPermissionCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  return codes.filter((c): c is string => typeof c === "string");
}

export function toClientRole(row: RoleRow, updaterName: string, operatorCount: number): Role {
  return {
    id: String(row.roleId),
    name: row.roleName,
    description: row.remark ?? "",
    builtin: row.roleType === "BUILTIN",
    operatorCount,
    roleType: "global",
    contractDefineCode: row.contractType,
    permissions: extractPermissionCodes(row.permissionCodes),
    updatedAt: row.updTime.toISOString(),
    updatedBy: updaterName,
  };
}
