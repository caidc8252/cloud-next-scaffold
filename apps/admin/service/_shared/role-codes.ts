// 角色 id 的跨域共享 helper。角色绑定走 JSONB（sys_party_user.roles / sys_operator_invite.roles
// 为 List<{roleId}>，sys_role.permission_codes 为 List<string>）。users / roles 两域都要解析这套
// 形状，放在 service/_shared 避免一个域 reach 进另一个域的 server 目录。

/** 原始 roleId 入参（string/number 混入）→ 去重升序的正整数列表（roleId 从 1 起，过滤 0/NaN）。 */
export function parseRoleIds(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const ids = input.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return normalizeRoleIds(ids);
}

/** 已是 number 的 roleId 列表 → 去重升序。 */
export function normalizeRoleIds(ids: number[]): number[] {
  return [...new Set(ids)].sort((left, right) => left - right);
}

/** roles JSONB（List<{roleId}>）→ 去重后的字符串 roleId 列表。 */
export function extractRoleIds(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  const ids = roles
    .map((r) => (r && typeof r === "object" ? (r as { roleId?: unknown }).roleId : undefined))
    .filter((id): id is number => typeof id === "number");
  return [...new Set(ids)].map(String);
}
