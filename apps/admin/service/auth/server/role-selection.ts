import "server-only";

// 「适用角色」筛选纯函数：PRIVATE 角色须属本 partner；GLOBAL（含代码注册表角色）全局可用。
// role 与 contract 解耦——契约门控只在菜单层，此处不再按 contractType / blocklist 过滤。

export type RoleRow = {
  roleId: number;
  roleName: string;
  roleType: string;
  partyId: number | null;
  permissionCodes: unknown;
};

export function selectApplicableRoles(input: { roles: RoleRow[]; partyId: number }): RoleRow[] {
  const { roles, partyId } = input;
  return roles.filter((role) => !(role.roleType === "PRIVATE" && role.partyId !== partyId));
}
