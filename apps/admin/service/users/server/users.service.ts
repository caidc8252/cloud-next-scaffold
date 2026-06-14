import "server-only";

import { randomBytes } from "node:crypto";
import { AuthzError, type ActiveSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import {
  ERR_USER_CANCEL_NOT_PENDING,
  ERR_USER_CANNOT_DISABLE_SELF,
  ERR_USER_EMAIL_TAKEN,
  ERR_USER_NO_PENDING_INVITE,
  ERR_USER_NOT_FOUND,
  ERR_USER_PROTECTED,
} from "@cloud/request/error-codes";
import { INVITE_TTL_MS, INVITE_TOKEN_BYTES } from "@cloud/platform-config";
import { extractRoleIds, parseRoleIds } from "@/service/_shared/role-codes";
import type { User } from "@/app/(portal)/system/_shared/types";
import { createPasswordResetToken } from "@/lib/password-reset-token";
import { sendInviteEmail, sendResetLinkEmail } from "@/lib/email";
import type {
  CreateInviteInput,
  SetInviteRolesInput,
  UpdateUserInput,
} from "@/service/users/schemas/users.schema";
import { toClientInvite, toClientUser } from "./users.mapper";
import { canChangeRoles, isProtectedUser, isSelf, rolesChanged } from "./users.policy";
import * as usersRepository from "./users.repository";

// 邀请 id 的解析与合成 id 同源（mapper 铸造 `invite-<id>`）。route 只允许依赖 service，
// 故由 service 转出，避免 route 直接 import mapper（被 lint 的数据层导入规则拦截）。
export { parseInviteId } from "./users.mapper";

// 用户域业务编排。接收「已解析的入参 + 当前会话」，从不接触 Request / URLSearchParams。
// 可预期错误一律 throw BusinessError（route 的 withApiHandler 统一兜底）。

/** 邀请人 id → 显示用户名（本人走 session，其余查库，查不到回退 system）。 */
async function resolveInviterName(session: ActiveSession, inviterUserId: number): Promise<string> {
  if (inviterUserId === session.userId) return session.displayName ?? "system";
  const names = await usersRepository.resolveUsernames([inviterUserId]);
  return names.get(inviterUserId) ?? "system";
}

/** 列表 = 在册用户 + 待消费邀请（合成 PENDING 伪条目）。route 与 page RSC 共用。 */
export async function listUsersAndInvites(partyId: number): Promise<User[]> {
  const [userRows, invites] = await Promise.all([
    usersRepository.listPartyUsers(partyId),
    usersRepository.listPendingInvites(partyId),
  ]);
  const inviterNames = await usersRepository.resolveUsernames(
    invites.map((invite) => invite.inviterUserId),
  );
  return [
    ...userRows.map((row) => toClientUser(row)),
    ...invites.map((invite) =>
      toClientInvite(invite, inviterNames.get(invite.inviterUserId) ?? "system"),
    ),
  ];
}

export async function createInvite(session: ActiveSession, input: CreateInviteInput): Promise<User> {
  const partyId = session.currentPartyId;
  const now = new Date();

  // 1) 已是成员（任意状态）→ 拒
  const existingUser = await usersRepository.findUserByEmail(input.email);
  if (existingUser) {
    const link = await usersRepository.findUserLink(partyId, existingUser.userId);
    if (link) throw new BusinessError(ERR_USER_EMAIL_TAKEN);
  }

  const roleIds = parseRoleIds(input.roleIds);
  const inviterName = session.displayName ?? "system";
  const newToken = () => randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);

  // 2) 同邮箱旧邀请：未过期→拒，已过期→覆盖，无→新建
  const pending = await usersRepository.findPendingInviteByEmail(partyId, input.email);
  let invite;
  if (pending && pending.expiresAt.getTime() > now.getTime()) {
    throw new BusinessError(ERR_USER_EMAIL_TAKEN);
  } else if (pending) {
    invite = await usersRepository.updateInvite(pending.operatorInviteId, {
      token: newToken(),
      expiresAt,
      intendedRole: roleIds.map((roleId) => ({ roleId })),
      resendCount: 0,
      status: "PENDING",
      inviterPartyId: partyId,
      inviterUserId: session.userId,
      updUserId: session.userId,
    });
  } else {
    invite = await usersRepository.createInvite({
      partyId,
      inviterPartyId: partyId,
      inviterUserId: session.userId,
      inviteEmail: input.email,
      intendedRole: roleIds.map((roleId) => ({ roleId })),
      token: newToken(),
      expiresAt,
      creUserId: session.userId,
    });
  }

  // 真发邀请邮件（含 onboarding accept 链接）。队列背压/节流异常会冒泡：邀请已落库，
  // 管理员可重发；这也让发信问题（背压/频率）显式可见。
  await sendInviteEmail({
    to: invite.inviteEmail,
    partyName: session.partyName,
    inviterName,
    token: invite.token,
    expiresAt: invite.expiresAt,
  });
  return toClientInvite(invite, inviterName);
}

export async function updateUser(
  session: ActiveSession,
  userId: number,
  input: UpdateUserInput,
): Promise<User> {
  const partyId = session.currentPartyId;
  const link = await usersRepository.findUserLink(partyId, userId);
  if (!link) throw new BusinessError(ERR_USER_NOT_FOUND, 404);

  // 受保护用户（本人 / ADMIN）只能改 remark，不能改角色。
  if (isProtectedUser(userId, session.userId, link.authorizingType) && input.roleIds !== undefined) {
    throw new BusinessError(ERR_USER_PROTECTED);
  }

  const requestedRoleIds = input.roleIds === undefined ? null : parseRoleIds(input.roleIds);
  if (requestedRoleIds !== null) {
    const currentRoleIds = extractRoleIds(link.roles).map(Number);
    if (rolesChanged(currentRoleIds, requestedRoleIds) && !canChangeRoles(session.permissions)) {
      throw new AuthzError(403, "forbidden");
    }
  }

  await usersRepository.updatePartyUser(partyId, userId, {
    updUserId: session.userId,
    ...(input.remark !== undefined ? { remark: input.remark.trim() || null } : {}),
    ...(requestedRoleIds !== null
      ? { roles: requestedRoleIds.map((roleId) => ({ roleId })) }
      : {}),
  });
  return toClientUser(await usersRepository.getUserWithLink(partyId, userId));
}

/** 锁定 / 解锁（partner-user 维度：ACTIVE ↔ LOCKED）。 */
export async function toggleUserLock(session: ActiveSession, userId: number): Promise<User> {
  if (isSelf(userId, session.userId)) throw new BusinessError(ERR_USER_CANNOT_DISABLE_SELF);

  const partyId = session.currentPartyId;
  const link = await usersRepository.findUserLink(partyId, userId);
  if (!link) throw new BusinessError(ERR_USER_NOT_FOUND, 404);
  if (link.authorizingType === "ADMIN") throw new BusinessError(ERR_USER_PROTECTED);

  await usersRepository.updatePartyUser(partyId, userId, {
    status: link.status === "ACTIVE" ? "LOCKED" : "ACTIVE",
    updUserId: session.userId,
  });
  return toClientUser(await usersRepository.getUserWithLink(partyId, userId));
}

/** 签发重置 token（存 Redis，72h TTL）；消费端后续补。 */
export async function resetUserPassword(session: ActiveSession, userId: number): Promise<User> {
  const partyId = session.currentPartyId;
  const link = await usersRepository.findUserLink(partyId, userId);
  if (!link || link.status !== "ACTIVE") throw new BusinessError(ERR_USER_NOT_FOUND, 404);
  if (isProtectedUser(userId, session.userId, link.authorizingType)) {
    throw new BusinessError(ERR_USER_PROTECTED);
  }

  const token = await createPasswordResetToken(userId);
  const user = toClientUser(await usersRepository.getUserWithLink(partyId, userId));
  // 发重置链接（落 portal /reset-password?token=，复用其消费端）。token 72h。
  await sendResetLinkEmail({ to: user.email, token, expiresText: "72 hours" });
  return user;
}

export async function cancelInvite(session: ActiveSession, inviteId: number): Promise<void> {
  const invite = await usersRepository.findInvite(session.currentPartyId, inviteId);
  if (!invite || invite.status !== "PENDING") {
    throw new BusinessError(ERR_USER_CANCEL_NOT_PENDING);
  }
  await usersRepository.deleteInvite(invite.operatorInviteId);
}

export async function resendInvite(session: ActiveSession, inviteId: number): Promise<User> {
  const invite = await usersRepository.findPendingInvite(session.currentPartyId, inviteId);
  if (!invite) throw new BusinessError(ERR_USER_NO_PENDING_INVITE, 404);

  const updated = await usersRepository.updateInvite(invite.operatorInviteId, {
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    updUserId: session.userId,
    resendCount: { increment: 1 },
  });

  const inviterName = await resolveInviterName(session, updated.inviterUserId);
  // 重发：再发一封邮件。收件人节流 60s 冷却会对连点重发抛 429（期望行为：提示稍后再试）。
  await sendInviteEmail({
    to: updated.inviteEmail,
    partyName: session.partyName,
    inviterName,
    token: updated.token,
    expiresAt: updated.expiresAt,
  });
  return toClientInvite(updated, inviterName);
}

export async function setInviteRoles(
  session: ActiveSession,
  inviteId: number,
  input: SetInviteRolesInput,
): Promise<User> {
  const invite = await usersRepository.findPendingInvite(session.currentPartyId, inviteId);
  if (!invite) throw new BusinessError(ERR_USER_NO_PENDING_INVITE, 404);

  const roleIds = parseRoleIds(input.roleIds);
  const updated = await usersRepository.updateInvite(invite.operatorInviteId, {
    intendedRole: roleIds.map((roleId) => ({ roleId })),
    updUserId: session.userId,
  });
  return toClientInvite(updated, await resolveInviterName(session, updated.inviterUserId));
}
