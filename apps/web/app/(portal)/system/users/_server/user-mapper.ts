import "server-only";

import type { User } from "@/app/(portal)/system/_shared/types";

// 角色绑定走 sys_partner_user.roles JSONB（List<{roleId}>）；邀请走 sys_operator_invite（无占位
// 用户）。密码历史走 sys_user.password_history JSONB；重置请求改 Redis，不再有可列出的历史。

type PartnerUserLink = { authorizingType: string; status: string; roles: unknown };

type UserRow = {
  userId: number;
  username: string;
  nickName: string;
  email: string;
  country: string | null;
  status: string;
  lastLoginAt: Date | null;
  passwordChangedTimestamp: Date | null;
  passwordErrorTimes: number;
  passwordErrorLockExpiredTimestamp: Date | null;
  passwordHistory: unknown;
  remark: string | null;
  creTime: Date;
  updTime: Date;
  partnerUsers: PartnerUserLink[];
};

type InviteRow = {
  operatorInviteId: number;
  inviteEmail: string;
  token: string;
  expiresAt: Date;
  resendCount: number;
  creTime: Date;
  inviterUserId: number;
  roles: unknown;
};

/** roles JSONB（List<{roleId}>）→ 字符串 roleId 列表。 */
export function extractRoleIds(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  const ids = roles
    .map((r) => (r && typeof r === "object" ? (r as { roleId?: unknown }).roleId : undefined))
    .filter((id): id is number => typeof id === "number");
  return [...new Set(ids)].map(String);
}

function passwordHistoryLength(history: unknown): number {
  return Array.isArray(history) ? history.length : 0;
}

export function toClientUser(row: UserRow): User {
  const link = row.partnerUsers[0];
  const partnerStatus = link?.status ?? row.status;
  const status: User["status"] = partnerStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE";

  return {
    id: String(row.userId),
    loginName: row.username,
    displayName: row.nickName,
    email: row.email,
    country: row.country ?? "",
    status,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    passwordChangedTimestamp: row.passwordChangedTimestamp?.getTime() ?? 0,
    passwordErrorTimes: row.passwordErrorTimes,
    passwordChangeTimes: passwordHistoryLength(row.passwordHistory),
    passwordErrorLockExpiredTimestamp: row.passwordErrorLockExpiredTimestamp?.getTime() ?? null,
    passwordUpdatedAt: null,
    remark: row.remark ?? "",
    createdAt: row.creTime.toISOString(),
    updatedAt: row.updTime.toISOString(),
    authorizingType: link?.authorizingType ?? "NORMAL",
    roleIds: extractRoleIds(link?.roles),
    passwordHistory: [],
    passwordResetRequests: [],
  };
}

/** 待消费邀请合成为一条 PENDING 列表项（id 前缀 invite-，与真实用户 id 区分）。 */
export function toClientInvite(row: InviteRow, inviterName: string): User {
  return {
    id: `invite-${row.operatorInviteId}`,
    loginName: "",
    displayName: "",
    email: "",
    country: "",
    status: "PENDING",
    lastLoginAt: null,
    passwordChangedTimestamp: 0,
    passwordErrorTimes: 0,
    passwordChangeTimes: 0,
    passwordErrorLockExpiredTimestamp: null,
    passwordUpdatedAt: null,
    remark: "",
    createdAt: row.creTime.toISOString(),
    updatedAt: row.creTime.toISOString(),
    authorizingType: "NORMAL",
    roleIds: extractRoleIds(row.roles),
    passwordHistory: [],
    invitedAt: row.creTime.toISOString(),
    invitedBy: inviterName,
    inviteExpiresAt: row.expiresAt.toISOString(),
    inviteToken: row.token,
    inviteEmail: row.inviteEmail,
    resendCount: row.resendCount,
    passwordResetRequests: [],
  };
}

/** 当前 partner 的用户归属 include（含 roles JSONB，用于推导 roleIds）。 */
export function userPartnerInclude(partnerId: number) {
  return {
    partnerUsers: {
      where: { partnerId },
      select: { authorizingType: true, status: true, roles: true },
    },
  } as const;
}
