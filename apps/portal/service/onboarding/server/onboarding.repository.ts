import "server-only";

import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import { ERR_OB_INVITE_CONSUMED } from "@/lib/onboarding-error-codes";

// onboarding 域数据访问。验票读取 + 接受邀请的原子绑定事务。

export function findInviteByToken(token: string) {
  return prisma.sysOperatorInvite.findUnique({
    where: { token },
    include: { partner: { select: { partyName: true } } },
  });
}

export function findUserByEmail(email: string) {
  return prisma.sysUser.findUnique({ where: { email } });
}

/** 邀请人显示名（查不到回退 system），用于归属的 authorizingUserName。 */
export async function resolveInviterName(inviterUserId: number): Promise<string> {
  const user = await prisma.sysUser.findUnique({
    where: { userId: inviterUserId },
    select: { nickName: true },
  });
  return user?.nickName ?? "system";
}

type NewUser = { email: string; passwordHash: string; nickName: string; country: string };

type BindInviteParams = {
  inviteId: number;
  partyId: number;
  /** 既有用户 id；为 null 时按 newUser 建号。 */
  userId: number | null;
  newUser?: NewUser;
  roles: unknown; // invite.intendedRole（[{roleId}]）原样写入归属
  inviterUserId: number;
  inviterName: string;
  now?: Date;
};

// 单事务：消费邀请（PENDING 条件更新，防并发双消费）→(建号)→ upsert 归属（幂等，恒 NORMAL）。
// 场景一目标 party 已 ACTIVE，不读写 sys_party；首管/激活属场景二（onboarding，CONF-1）。
export async function bindInvite(
  params: BindInviteParams,
): Promise<{ userId: number; alreadyMember: boolean }> {
  const now = params.now ?? new Date();

  return prisma.$transaction(async (tx) => {
    // 1) 原子消费邀请：仅 PENDING → CONSUMED。count 0 表示已被他人消费/取消。
    const consumed = await tx.sysOperatorInvite.updateMany({
      where: { operatorInviteId: params.inviteId, status: "PENDING" },
      data: { status: "CONSUMED", consumedAt: now, updUserId: params.inviterUserId },
    });
    if (consumed.count === 0) throw new BusinessError(ERR_OB_INVITE_CONSUMED, 404);

    // 2) 解析/创建用户
    let userId = params.userId;
    if (userId === null) {
      if (!params.newUser) throw new BusinessError(ERR_OB_INVITE_CONSUMED, 404);
      const created = await tx.sysUser.create({
        data: {
          email: params.newUser.email,
          passwordHash: params.newUser.passwordHash,
          passwordChangedTimestamp: now,
          nickName: params.newUser.nickName,
          country: params.newUser.country,
          status: "ACTIVE",
          creUserId: params.inviterUserId,
        },
        select: { userId: true },
      });
      userId = created.userId;
    }

    // 3) upsert 归属（幂等：已是成员则不改角色/类型）
    const existing = await tx.sysPartyUser.findUnique({
      where: { partyId_userId: { partyId: params.partyId, userId } },
      select: { partyUserId: true },
    });
    let alreadyMember = false;
    if (existing) {
      alreadyMember = true;
    } else {
      await tx.sysPartyUser.create({
        data: {
          partyId: params.partyId,
          userId,
          roles: params.roles as never,
          authorizingType: "NORMAL",
          authorizingTimestamp: now,
          authorizingUserId: params.inviterUserId,
          authorizingUserName: params.inviterName,
          status: "ACTIVE",
          creUserId: params.inviterUserId,
        },
      });
    }

    return { userId, alreadyMember };
  });
}
