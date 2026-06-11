import "server-only";

import { prisma } from "@cloud/db";

// account 域数据访问。只做 prisma 查询 / 变更,无 session / HTTP 感知。

type UpdateUserData = Parameters<typeof prisma.sysUser.update>[0]["data"];

/** 当前登录用户的完整行（profile / password / mfa 标记等都从这里取需要的字段）。 */
export function getUser(userId: number) {
  return prisma.sysUser.findUniqueOrThrow({ where: { userId } });
}

/** 同邮箱用户（citext），排除自己——邮箱唯一性校验。 */
export function findUserByEmail(email: string, excludeUserId: number) {
  return prisma.sysUser.findFirst({
    where: { email, NOT: { userId: excludeUserId } },
    select: { userId: true },
  });
}

export function updateUser(userId: number, data: UpdateUserData) {
  return prisma.sysUser.update({ where: { userId }, data });
}

/** 用户归属的全部 partner（含 LOCKED）+ partner 名称，供「切换公司」列表。 */
export function listPartyMemberships(userId: number) {
  return prisma.sysPartyUser.findMany({
    where: { userId },
    include: { partner: { select: { partyId: true, partyName: true } } },
    orderBy: { authorizingTimestamp: "desc" },
  });
}

/** 给定 party 集合的「生效中」契约类型（供派生 contractTypes）。
 *  只取 status=ACTIVE：SUSPENDED（挂起）/ TERMINATED（终止）均视为非生效，不计入 live 契约类型。 */
export function listActiveContractTypes(partyIds: number[]) {
  return prisma.sysPartyContract.findMany({
    where: { authorizedPartyId: { in: partyIds }, status: "ACTIVE" },
    select: { authorizedPartyId: true, authorizedContractType: true },
  });
}
