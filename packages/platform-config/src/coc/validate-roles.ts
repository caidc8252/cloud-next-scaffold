import type { RegistryDiagnostic } from "./registry-types.ts";

/**
 * 校验死写 GLOBAL 角色的 roleId:必须落在预置分配区间 [minId, maxId] 内,且全局唯一。
 * minId/maxId 由调用方注入(本仓 = [1, PRESET_ROLE_ID_ALLOCATION_MAX]);
 * 区间外 = 撞 DB 动态 PRIVATE 空间或非法,重复 = 角色解析歧义,均 error 级。
 */
export function validateGlobalRoles(args: {
  globalRoles: readonly { roleId: number; roleName: string }[];
  minId: number;
  maxId: number;
}): RegistryDiagnostic[] {
  const { globalRoles, minId, maxId } = args;
  const out: RegistryDiagnostic[] = [];

  const outOfRange = globalRoles.filter((r) => !Number.isInteger(r.roleId) || r.roleId < minId || r.roleId > maxId);
  if (outOfRange.length) {
    out.push({
      level: "error",
      rule: "role-id-out-of-range",
      message: `GLOBAL role roleId must be an integer within [${minId}, ${maxId}] (preset allocation): ${outOfRange.map((r) => `${r.roleName}#${r.roleId}`).join(", ")}.`,
      codes: outOfRange.map((r) => String(r.roleId)),
    });
  }

  const counts = new Map<number, number>();
  for (const r of globalRoles) counts.set(r.roleId, (counts.get(r.roleId) ?? 0) + 1);
  const dups = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  if (dups.length) {
    out.push({
      level: "error",
      rule: "duplicate-role-id",
      message: `duplicate GLOBAL role roleId(s): ${dups.join(", ")}.`,
      codes: dups.map(String),
    });
  }

  return out;
}
