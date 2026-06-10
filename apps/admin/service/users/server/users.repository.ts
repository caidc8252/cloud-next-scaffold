import "server-only";

import { prisma } from "@cloud/db";

// 用户域数据访问。只做 prisma 查询 / 变更，无 session / 权限 / HTTP 感知；上层 service 负责编排。
// 角色绑定走 sys_partner_user.roles JSONB；邀请走 sys_operator_invite（无占位用户）。

/** partner 下「在册」用户的归属状态（活跃 + 锁定，排除已移除）。 */
const ACTIVE_OR_LOCKED = ["ACTIVE", "LOCKED"] as const;

/** 当前 partner 的用户归属 include（含 roles JSONB，用于推导 roleIds）。 */
function userPartnerInclude(partnerId: number) {
  return {
    partnerUsers: {
      where: { partnerId },
      select: { authorizingType: true, status: true, roles: true, remark: true },
    },
  } as const;
}

type CreateInviteData = Parameters<typeof prisma.sysOperatorInvite.create>[0]["data"];
type UpdateInviteData = Parameters<typeof prisma.sysOperatorInvite.update>[0]["data"];
type UpdatePartnerUserData = Parameters<typeof prisma.sysPartnerUser.update>[0]["data"];

/** 当前 partner 下在册用户（含归属 link），按建档时间升序。 */
export async function listPartnerUsers(partnerId: number) {
  const links = await prisma.sysPartnerUser.findMany({
    where: { partnerId, status: { in: [...ACTIVE_OR_LOCKED] } },
    select: { userId: true },
  });
  const userIds = links.map((link) => link.userId);
  if (userIds.length === 0) return [];
  return prisma.sysUser.findMany({
    where: { userId: { in: userIds } },
    include: userPartnerInclude(partnerId),
    orderBy: { creTime: "asc" },
  });
}

/** 当前 partner 下待消费邀请，最新优先。 */
export function listPendingInvites(partnerId: number) {
  return prisma.sysOperatorInvite.findMany({
    where: { partnerId, status: "PENDING" },
    orderBy: { creTime: "desc" },
  });
}

/** userId → username 映射（用于把邀请人 id 显示成用户名）。 */
export async function resolveUsernames(userIds: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  const rows = await prisma.sysUser.findMany({
    where: { userId: { in: unique } },
    select: { userId: true, username: true },
  });
  return new Map(rows.map((row) => [row.userId, row.username]));
}

/** 某用户在当前 partner 下的归属关系（不存在返回 null）。 */
export function findUserLink(partnerId: number, userId: number) {
  return prisma.sysPartnerUser.findUnique({
    where: { partnerId_userId: { partnerId, userId } },
  });
}

/** 变更后重新读出用户 + 归属 link，供 mapper 出 VO。 */
export function getUserWithLink(partnerId: number, userId: number) {
  return prisma.sysUser.findUniqueOrThrow({
    where: { userId },
    include: userPartnerInclude(partnerId),
  });
}

export function updatePartnerUser(partnerId: number, userId: number, data: UpdatePartnerUserData) {
  return prisma.sysPartnerUser.update({
    where: { partnerId_userId: { partnerId, userId } },
    data,
  });
}

export function findPendingInviteByEmail(partnerId: number, inviteEmail: string) {
  return prisma.sysOperatorInvite.findFirst({
    where: { partnerId, inviteEmail, status: "PENDING" },
  });
}

/** 当前 partner 下任意状态的邀请（cancel 用，需区分 PENDING 与否）。 */
export function findInvite(partnerId: number, operatorInviteId: number) {
  return prisma.sysOperatorInvite.findFirst({
    where: { operatorInviteId, partnerId },
  });
}

/** 当前 partner 下待消费邀请（resend / 改角色用）。 */
export function findPendingInvite(partnerId: number, operatorInviteId: number) {
  return prisma.sysOperatorInvite.findFirst({
    where: { operatorInviteId, partnerId, status: "PENDING" },
  });
}

export function createInvite(data: CreateInviteData) {
  return prisma.sysOperatorInvite.create({ data });
}

export function updateInvite(operatorInviteId: number, data: UpdateInviteData) {
  return prisma.sysOperatorInvite.update({ where: { operatorInviteId }, data });
}

export function deleteInvite(operatorInviteId: number) {
  return prisma.sysOperatorInvite.delete({ where: { operatorInviteId } });
}
