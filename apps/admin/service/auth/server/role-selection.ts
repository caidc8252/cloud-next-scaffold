import "server-only";

// NORMAL 授权下的「适用角色」筛选纯函数：契约命中（含公共 '*'）+ 未被 blocklist + PRIVATE 须本 partner。

export type RoleRow = {
  roleId: number;
  roleName: string;
  roleType: string;
  contractType: string;
  partnerId: number | null;
  permissionCodes: unknown;
};

export function selectApplicableRoles(input: {
  roles: RoleRow[];
  contractTypes: string[];
  blockedRoleIds: Set<number>;
  partnerId: number;
}): RoleRow[] {
  const { roles, contractTypes, blockedRoleIds, partnerId } = input;
  return roles.filter((role) => {
    const contractMatch = contractTypes.includes(role.contractType) || role.contractType === "*";
    if (!contractMatch) return false;
    if (blockedRoleIds.has(role.roleId)) return false;
    if (role.roleType === "PRIVATE" && role.partnerId !== partnerId) return false;
    return true;
  });
}
