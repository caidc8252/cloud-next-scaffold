import "server-only";

import { prisma } from "@cloud/db";

// forgot-password 域数据访问。

export function findUserByEmail(email: string) {
  return prisma.sysUser.findUnique({ where: { email } });
}

export function findUserById(userId: number) {
  return prisma.sysUser.findUnique({ where: { userId } });
}

type PasswordUpdate = {
  passwordHash: string;
  passwordHistory: string[];
  passwordChangedTimestamp: Date;
};

// 重置成功：换哈希 + 历史、记改密时间，并清空刷错锁计数（重置即恢复访问）。
export function updatePassword(userId: number, update: PasswordUpdate) {
  return prisma.sysUser.update({
    where: { userId },
    data: {
      passwordHash: update.passwordHash,
      passwordHistory: update.passwordHistory,
      passwordChangedTimestamp: update.passwordChangedTimestamp,
      passwordErrorTimes: 0,
      passwordErrorLockExpiredTimestamp: null,
    },
  });
}
