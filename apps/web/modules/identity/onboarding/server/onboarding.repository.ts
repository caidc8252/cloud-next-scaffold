import "server-only";

import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import {
  ERR_OB_ALREADY_MEMBER,
  ERR_OB_INVITE_CONSUMED,
} from "@/modules/identity/onboarding/error/onboarding.error-codes";

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

/** 该用户是否已是本 party 成员（按 @@unique([partyId,userId]) 单行存在判定，口径与 bindInvite 事务内兜底一致）。 */
export async function isPartyMember(partyId: number, userId: number): Promise<boolean> {
  const link = await prisma.sysPartyUser.findUnique({
    where: { partyId_userId: { partyId, userId } },
    select: { partyUserId: true },
  });
  return link !== null;
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

// 接受邀请的原子绑定。CONF-1：场景一目标 party 已 ACTIVE，本路径成员恒 NORMAL、不读写 sys_party
//（首管/激活属场景二 onboarding）。已是本 party 成员 → 抛 ALREADY_MEMBER、不重复加入。
// 事务前先预检既有用户的成员身份：命中即拒、不开事务（省去「消费邀请→回滚」开销）；
// 新建用户（userId=null）必非成员，跳过预检；并发竞态由事务内的兜底校验保证最终一致。
export async function bindInvite(params: BindInviteParams): Promise<{ userId: number }> {
  const now = params.now ?? new Date();

  if (params.userId !== null && (await isPartyMember(params.partyId, params.userId))) {
    throw new BusinessError(ERR_OB_ALREADY_MEMBER, 409);
  }

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

    // 3) 建归属：事务内再判一次成员身份（并发兜底），命中则抛错回滚（邀请还原 PENDING）。
    const existing = await tx.sysPartyUser.findUnique({
      where: { partyId_userId: { partyId: params.partyId, userId } },
      select: { partyUserId: true },
    });
    if (existing) throw new BusinessError(ERR_OB_ALREADY_MEMBER, 409);
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

    return { userId };
  });
}
