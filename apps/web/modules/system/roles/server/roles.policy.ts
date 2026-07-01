import "server-only";

import { PRESET_ROLE_ID_MAX } from "@cloud/platform-config";

// 角色域的范围 / 实体保护规则（纯函数）。粗粒度的 roles.* 码校验在 route 用 assertPermissions 做。

/** 角色对当前 partner 可见 / 可操作：全局角色（partyId 为 null）或本 partner 自有角色。 */
export function roleBelongsToPartner(rolePartyId: number | null, partyId: number): boolean {
  return rolePartyId === null || rolePartyId === partyId;
}

/** 内置/通用角色：roleId ≤ PRESET_ROLE_ID_MAX（死写 GLOBAL，名称/描述只读、不可删除）；DB 动态 PRIVATE 角色 ≥ DB_ROLE_ID_MIN。 */
export function isBuiltinRole(roleId: number): boolean {
  return roleId <= PRESET_ROLE_ID_MAX;
}
