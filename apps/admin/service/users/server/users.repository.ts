import "server-only";

import { prisma } from "@cloud/db";

// 用户域数据访问。只做 prisma 查询 / 变更，无 session / 权限 / HTTP 感知；上层 service 负责编排。
// 角色绑定走 sys_party_user.roles JSONB；邀请走 sys_operator_invite（无占位用户）。

/** partner 下「在册」用户的归属状态（活跃 + 锁定，排除已移除）。 */
const ACTIVE_OR_LOCKED = ["ACTIVE", "LOCKED"] as const;

/** 当前 partner 的用户归属 include（含 roles JSONB，用于推导 roleIds）。 */
function userPartnerInclude(partyId: number) {
  return {
    partyUsers: {
      where: { partyId },
      select: { authorizingType: true, status: true, roles: true, remark: true },
    },
  } as const;
}

type CreateInviteData = Parameters<typeof prisma.sysOperatorInvite.create>[0]["data"];
type UpdateInviteData = Parameters<typeof prisma.sysOperatorInvite.update>[0]["data"];
type UpdatePartyUserData = Parameters<typeof prisma.sysPartyUser.update>[0]["data"];

/** 当前 partner 下在册用户（含归属 link），按建档时间升序。 */
export async function listPartyUsers(partyId: number) {
  const links = await prisma.sysPartyUser.findMany({
    where: { partyId, status: { in: [...ACTIVE_OR_LOCKED] } },
    select: { userId: true },
  });
  const userIds = links.map((link) => link.userId);
  if (userIds.length === 0) return [];
  return prisma.sysUser.findMany({
    where: { userId: { in: userIds } },
    include: userPartnerInclude(partyId),
    orderBy: { creTime: "asc" },
  });
}

/** 当前 partner 下待消费邀请，最新优先。 */
export function listPendingInvites(partyId: number) {
  return prisma.sysOperatorInvite.findMany({
    where: { partyId, status: "PENDING" },
    orderBy: { creTime: "desc" },
  });
}

/** userId → 显示名（nickName）映射（用于把邀请人 id 显示成名字）。 */
export async function resolveUsernames(userIds: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map();
  const rows = await prisma.sysUser.findMany({
    where: { userId: { in: unique } },
    select: { userId: true, nickName: true },
  });
  return new Map(rows.map((row) => [row.userId, row.nickName]));
}

/** 某用户在当前 partner 下的归属关系（不存在返回 null）。 */
export function findUserLink(partyId: number, userId: number) {
  return prisma.sysPartyUser.findUnique({
    where: { partyId_userId: { partyId, userId } },
  });
}

/** 邮箱 → 用户（createInvite 成员校验用，查不到返回 null）。 */
export function findUserByEmail(email: string) {
  return prisma.sysUser.findUnique({ where: { email } });
}

/** 变更后重新读出用户 + 归属 link，供 mapper 出 VO。 */
export function getUserWithLink(partyId: number, userId: number) {
  return prisma.sysUser.findUniqueOrThrow({
    where: { userId },
    include: userPartnerInclude(partyId),
  });
}

export function updatePartyUser(partyId: number, userId: number, data: UpdatePartyUserData) {
  return prisma.sysPartyUser.update({
    where: { partyId_userId: { partyId, userId } },
    data,
  });
}

export function findPendingInviteByEmail(partyId: number, inviteEmail: string) {
  return prisma.sysOperatorInvite.findFirst({
    where: { partyId, inviteEmail, status: "PENDING" },
  });
}

/** 当前 partner 下任意状态的邀请（cancel 用，需区分 PENDING 与否）。 */
export function findInvite(partyId: number, operatorInviteId: number) {
  return prisma.sysOperatorInvite.findFirst({
    where: { operatorInviteId, partyId },
  });
}

/** 当前 partner 下「未过期」待消费邀请（resend / 改角色 / 重新生成 共用）。 */
export function findPendingInvite(partyId: number, operatorInviteId: number, now: Date = new Date()) {
  return prisma.sysOperatorInvite.findFirst({
    where: { operatorInviteId, partyId, status: "PENDING", expiresAt: { gt: now } },
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

/** 读取用户偏好语言（用于按收件人 locale 渲染通知文案）；无值时回退 "en"。 */
export async function findUserLocale(userId: number): Promise<string> {
  const u = await prisma.sysUser.findUnique({ where: { userId }, select: { locale: true } });
  return u?.locale ?? "en";
}
