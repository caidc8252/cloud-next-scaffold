import "server-only";

import { prisma } from "@cloud/db";

// 角色域数据访问。只做 prisma 查询 / 变更,无 session / 权限 / HTTP 感知。
// 角色绑定走 sys_partner_user.roles JSONB;权限码走 sys_role.permission_codes JSONB。

const ACTIVE_OR_LOCKED = ["ACTIVE", "LOCKED"] as const;

type CreateRoleData = Parameters<typeof prisma.sysRole.create>[0]["data"];
type UpdateRoleData = Parameters<typeof prisma.sysRole.update>[0]["data"];

/** 当前 partner 可见的角色：自有角色 + 全局角色（partnerId 为 null），按建档时间升序。 */
export function listRoles(partnerId: number) {
  return prisma.sysRole.findMany({
    where: { OR: [{ partnerId }, { partnerId: null }] },
    orderBy: { creTime: "asc" },
  });
}

/** 当前 partner 在册用户的角色绑定（roles JSONB），供按角色统计绑定用户数。 */
export function listPartnerRoleBindings(partnerId: number) {
  return prisma.sysPartnerUser.findMany({
    where: { partnerId, status: { in: [...ACTIVE_OR_LOCKED] } },
    select: { roles: true },
  });
}

/** userId → username 映射（更新人显示名）。 */
export async function resolveUsernames(userIds: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  const rows = await prisma.sysUser.findMany({
    where: { userId: { in: unique } },
    select: { userId: true, username: true },
  });
  return new Map(rows.map((row) => [row.userId, row.username]));
}

export function findRole(roleId: number) {
  return prisma.sysRole.findUnique({ where: { roleId } });
}

export function createRole(data: CreateRoleData) {
  return prisma.sysRole.create({ data });
}

export function updateRole(roleId: number, data: UpdateRoleData) {
  return prisma.sysRole.update({ where: { roleId }, data });
}

export function deleteRole(roleId: number) {
  return prisma.sysRole.delete({ where: { roleId } });
}

/** 当前 partner 下绑定该角色的在册用户数（更新后回填 operatorCount）。 */
export function countRoleOperatorsInPartner(partnerId: number, roleId: number) {
  return prisma.sysPartnerUser.count({
    where: {
      partnerId,
      status: { in: [...ACTIVE_OR_LOCKED] },
      roles: { array_contains: [{ roleId }] },
    },
  });
}

/** 跨所有 partner 是否仍有用户绑定该角色（删除安全校验,不限当前 partner）。 */
export function countRoleAssignmentsAnyPartner(roleId: number) {
  return prisma.sysPartnerUser.count({
    where: { roles: { array_contains: [{ roleId }] } },
  });
}
