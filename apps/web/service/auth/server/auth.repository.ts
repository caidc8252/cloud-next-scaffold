import "server-only";

import { prisma } from "@cloud/db";

// auth 域数据访问。只做 prisma 查询 / 变更,无 session / HTTP 感知。

type FailureUpdate = {
  passwordErrorTimes: number;
  passwordErrorLockExpiredTimestamp: Date | null;
};

export function findUserByUsername(username: string) {
  return prisma.sysUser.findUnique({ where: { username } });
}

export function findUserById(userId: number) {
  return prisma.sysUser.findUnique({ where: { userId } });
}

/** 密码错误：累加错误次数 / 刷新锁定时间戳（值由 computeFailureUpdate 算好）。 */
export function recordLoginFailure(userId: number, update: FailureUpdate) {
  return prisma.sysUser.update({
    where: { userId },
    data: {
      passwordErrorTimes: update.passwordErrorTimes,
      passwordErrorLockExpiredTimestamp: update.passwordErrorLockExpiredTimestamp,
    },
  });
}

/** 登录成功（唯一清零点）：错误次数清零、解锁、记录 lastLoginAt。 */
export function recordLoginSuccess(userId: number, loginAt: Date) {
  return prisma.sysUser.update({
    where: { userId },
    data: {
      passwordErrorTimes: 0,
      passwordErrorLockExpiredTimestamp: null,
      lastLoginAt: loginAt,
    },
  });
}

/** 用户的全部 partner 归属（含 partner 本体，用于过滤 ACTIVE+ACTIVE）。 */
export function listPartnerMemberships(userId: number) {
  return prisma.sysPartnerUser.findMany({
    where: { userId },
    include: { partner: true },
  });
}

/** 某用户在指定 partner 的归属（含 partner 本体），用于选择公司校验。 */
export function findPartnerMembership(partnerId: number, userId: number) {
  return prisma.sysPartnerUser.findUnique({
    where: { partnerId_userId: { partnerId, userId } },
    include: { partner: true },
  });
}

/** 用户全部 partner 归属 + partner 本体 + 各 partner 的 ACTIVE 合同（供选择页/登录路由判定可选性）。 */
export function listPartnerMembershipsWithContracts(userId: number) {
  return prisma.sysPartnerUser.findMany({
    where: { userId },
    include: {
      partner: {
        select: {
          partnerId: true,
          partnerName: true,
          status: true,
          timezone: true,
          contracts: {
            where: { status: "ACTIVE" },
            select: {
              authorizedContractType: true,
              effectiveFromDate: true,
              effectiveToDate: true,
            },
          },
        },
      },
    },
  });
}
