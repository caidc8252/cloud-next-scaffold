import "server-only";

import { extractRoleIds } from "@/service/_shared/role-codes";
import type { User } from "@/app/(dashboard)/system/_shared/types";

// Entity → VO 映射。角色绑定走 sys_party_user.roles JSONB（List<{roleId}>）；邀请走
// sys_operator_invite（无占位用户）。密码历史走 sys_user.password_history JSONB；重置请求改
// Redis，不再有可列出的历史。

type PartyUserLink = {
  authorizingType: string;
  status: string;
  roles: unknown;
  remark: string | null;
};

export type UserRow = {
  userId: number;
  nickName: string;
  email: string;
  country: string | null;
  status: string;
  lastLoginAt: Date | null;
  passwordChangedTimestamp: Date | null;
  passwordErrorTimes: number;
  passwordErrorLockExpiredTimestamp: Date | null;
  creTime: Date;
  updTime: Date;
  partyUsers: PartyUserLink[];
};

export type InviteRow = {
  operatorInviteId: number;
  inviteEmail: string;
  token: string;
  expiresAt: Date;
  resendCount: number;
  creTime: Date;
  inviterUserId: number;
  intendedRole: unknown;
};

export function toClientUser(row: UserRow): User {
  const link = row.partyUsers[0];
  const partnerStatus = link?.status ?? row.status;
  const status: User["status"] = partnerStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE";

  return {
    id: String(row.userId),
    loginName: row.email,
    displayName: row.nickName,
    email: row.email,
    country: row.country ?? "",
    status,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    passwordChangedTimestamp: row.passwordChangedTimestamp?.getTime() ?? 0,
    passwordErrorTimes: row.passwordErrorTimes,
    passwordErrorLockExpiredTimestamp: row.passwordErrorLockExpiredTimestamp?.getTime() ?? null,
    remark: link?.remark ?? "",
    createdAt: row.creTime.toISOString(),
    updatedAt: row.updTime.toISOString(),
    authorizingType: link?.authorizingType ?? "NORMAL",
    roleIds: extractRoleIds(link?.roles),
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
    passwordErrorLockExpiredTimestamp: null,
    remark: "",
    createdAt: row.creTime.toISOString(),
    updatedAt: row.creTime.toISOString(),
    authorizingType: "NORMAL",
    roleIds: extractRoleIds(row.intendedRole),
    invitedAt: row.creTime.toISOString(),
    invitedBy: inviterName,
    inviteExpiresAt: row.expiresAt.toISOString(),
    inviteToken: row.token,
    inviteEmail: row.inviteEmail,
    resendCount: row.resendCount,
  };
}

/** `toClientInvite` 的 id 形如 `invite-<operatorInviteId>`；这里解析回数字 id（非法得 NaN）。 */
export function parseInviteId(rawId: string): number {
  return Number(rawId.replace(/^invite-/, ""));
}
