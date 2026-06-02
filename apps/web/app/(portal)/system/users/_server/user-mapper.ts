import "server-only";

import type { User, PasswordResetRequest } from "@/app/(portal)/system/_shared/types";

type UserRow = {
  userId: number;
  username: string | null;
  displayName: string | null;
  email: string | null;
  country: string | null;
  status: string;
  lastLoginAt: Date | null;
  passwordChangedTimestamp: Date | null;
  passwordErrorTimes: number;
  passwordErrorLockExpiredTimestamp: Date | null;
  passwordUpdatedAt: Date | null;
  remark: string | null;
  creTime: Date;
  updTime: Date;
  passwordHistory: { userPasswordHistoryId: string; changedTimestamp: Date | null }[];
  userRoles: { roleId: number }[];
  partnerUsers: { authorizingType: string; status: string }[];
  invites: {
    email: string;
    token: string;
    expiresAt: Date;
    status: string;
    creTime: Date;
    creUserId: number;
    resendCount: number;
  }[];
  passwordResetRequests: {
    requestId: number;
    token: string;
    expiresAt: Date;
    consumedAt: Date | null;
    status: string;
    creTime: Date;
    creUserId: number;
  }[];
};

export function toClientUser(
  row: UserRow,
  inviterNameMap: Map<number, string>,
  requesterNameMap: Map<number, string>,
): User {
  const latestInvite = row.invites[0] ?? null;
  const isPending = row.status === "PENDING";
  const partnerUserStatus = row.partnerUsers[0]?.status ?? row.status;
  const mappedStatus: User["status"] = isPending ? "PENDING" : (partnerUserStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE");

  return {
    id: String(row.userId),
    loginName: row.username ?? "",
    displayName: row.displayName ?? "",
    email: isPending ? "" : (row.email ?? ""),
    country: row.country ?? "",
    status: mappedStatus,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    passwordChangedTimestamp: row.passwordChangedTimestamp?.getTime() ?? 0,
    passwordErrorTimes: row.passwordErrorTimes,
    passwordChangeTimes: row.passwordHistory.length,
    passwordErrorLockExpiredTimestamp: row.passwordErrorLockExpiredTimestamp?.getTime() ?? null,
    passwordUpdatedAt: row.passwordUpdatedAt?.toISOString() ?? null,
    remark: row.remark ?? "",
    createdAt: row.creTime.toISOString(),
    updatedAt: row.updTime.toISOString(),
    authorizingType: row.partnerUsers[0]?.authorizingType ?? "NORMAL",
    roleIds: row.userRoles.map((ur) => String(ur.roleId)),
    passwordHistory: row.passwordHistory.map((h) => ({
      hashId: h.userPasswordHistoryId,
      changedAt: h.changedTimestamp?.toISOString() ?? row.creTime.toISOString(),
    })),
    // Invite fields (only for PENDING)
    ...(latestInvite && isPending ? {
      invitedAt: latestInvite.creTime.toISOString(),
      invitedBy: inviterNameMap.get(latestInvite.creUserId) ?? "system",
      inviteExpiresAt: latestInvite.expiresAt.toISOString(),
      inviteToken: latestInvite.token,
      inviteEmail: latestInvite.email,
      resendCount: latestInvite.resendCount,
    } : {}),
    // Password reset requests
    passwordResetRequests: row.passwordResetRequests.map((r) => toClientResetRequest(r, requesterNameMap)),
  };
}

function toClientResetRequest(
  r: UserRow["passwordResetRequests"][number],
  nameMap: Map<number, string>,
): PasswordResetRequest {
  return {
    id: String(r.requestId),
    requestedBy: nameMap.get(r.creUserId) ?? "system",
    requestedAt: r.creTime.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    consumedAt: r.consumedAt?.toISOString() ?? null,
    status: r.status.toLowerCase() as PasswordResetRequest["status"],
  };
}

/** Prisma include clause shared by all user queries */
export const USER_INCLUDE = {
  passwordHistory: {
    select: { userPasswordHistoryId: true, changedTimestamp: true },
    orderBy: { creTime: "desc" as const },
  },
  userRoles: { select: { roleId: true } },
  partnerUsers: { select: { authorizingType: true, status: true } },
  invites: {
    where: { status: "PENDING" },
    orderBy: { creTime: "desc" as const },
    take: 1,
    select: { email: true, token: true, expiresAt: true, status: true, creTime: true, creUserId: true, resendCount: true },
  },
  passwordResetRequests: {
    orderBy: { creTime: "desc" as const },
    take: 10,
    select: { requestId: true, token: true, expiresAt: true, consumedAt: true, status: true, creTime: true, creUserId: true },
  },
} as const;

/** Collect unique creUserId values from invites & reset requests for batch username lookup */
export function collectAuxUserIds(rows: UserRow[]): number[] {
  const ids = new Set<number>();
  for (const r of rows) {
    for (const inv of r.invites) ids.add(inv.creUserId);
    for (const req of r.passwordResetRequests) ids.add(req.creUserId);
  }
  ids.delete(0);
  return [...ids];
}
