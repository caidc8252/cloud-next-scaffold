import "server-only";

// 角色域的范围 / 实体保护规则（纯函数）。粗粒度的 roles.* 码校验在 route 用 assertPermissions 做。

/** 角色对当前 partner 可见 / 可操作：全局角色（partnerId 为 null）或本 partner 自有角色。 */
export function roleBelongsToPartner(rolePartnerId: number | null, partnerId: number): boolean {
  return rolePartnerId === null || rolePartnerId === partnerId;
}

/** 内置角色：名称 / 描述只读，且不可删除（仅权限可改）。 */
export function isBuiltinRole(roleType: string): boolean {
  return roleType === "BUILTIN";
}
