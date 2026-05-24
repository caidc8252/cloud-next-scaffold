import "server-only";

import type { Role } from "@cloud/system";

type RoleRow = {
  roleId: number;
  roleName: string;
  roleType: string;
  contractDefineCode: string | null;
  remark: string | null;
  updTime: Date;
  updUserId: number;
  permissions: { permissionCode: string }[];
  _count: { userRoles: number };
};

export function toClientRole(row: RoleRow, updaterName: string): Role {
  return {
    id: String(row.roleId),
    name: row.roleName,
    description: row.remark ?? "",
    builtin: row.roleType === "BUILTIN",
    operatorCount: row._count.userRoles,
    roleType: "global",
    contractDefineCode: row.contractDefineCode ?? "ADMIN",
    permissions: row.permissions.map((p) => p.permissionCode),
    updatedAt: row.updTime.toISOString(),
    updatedBy: updaterName,
  };
}
