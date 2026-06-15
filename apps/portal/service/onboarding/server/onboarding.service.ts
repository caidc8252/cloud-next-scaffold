import "server-only";

import { hashPassword } from "@cloud/security/server";
import { BusinessError } from "@cloud/request";
import { decryptAndValidatePassword } from "@/lib/password-input";
import { buildSessionAndRedirect } from "@/service/auth/server/auth.service";
import {
  ERR_OB_EMAIL_TAKEN,
  ERR_OB_INVITE_CONSUMED,
  ERR_OB_INVITE_EXPIRED,
  ERR_OB_INVITE_NOT_FOUND,
  ERR_OB_NOT_AUTHENTICATED,
  ERR_OB_PASSWORD_WEAK,
} from "@/lib/onboarding-error-codes";
import type { AcceptInput, AcceptResult, InvitePublic } from "@/service/onboarding/schemas/onboarding.schema";
import * as repo from "./onboarding.repository";

// onboarding 域业务编排：验票 + 接受邀请（绑定 + 消费 + 激活 + 建会话）。
// 授权模型 = token 授权：有效 token 即可绑定任一账号；inviteEmail 仅作新建账号预填。

type InviteRow = NonNullable<Awaited<ReturnType<typeof repo.findInviteByToken>>>;

/** 取出有效邀请：必须 PENDING 且未过期，否则抛对应业务错误。 */
async function requireValidInvite(token: string, now: Date): Promise<InviteRow> {
  const invite = await repo.findInviteByToken(token);
  if (!invite) throw new BusinessError(ERR_OB_INVITE_NOT_FOUND, 404);
  if (invite.status !== "PENDING") throw new BusinessError(ERR_OB_INVITE_CONSUMED, 404);
  if (invite.expiresAt.getTime() <= now.getTime()) throw new BusinessError(ERR_OB_INVITE_EXPIRED, 404);
  return invite;
}

function toIntendedRole(value: unknown): { roleId: number }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is { roleId: number } =>
      !!r && typeof r === "object" && typeof (r as { roleId?: unknown }).roleId === "number",
  );
}

/** 验票（公开，无需会话）。 */
export async function getInvite(token: string): Promise<InvitePublic> {
  const invite = await requireValidInvite(token, new Date());
  return {
    partyName: invite.partner.partyName,
    inviteEmail: invite.inviteEmail,
    intendedRole: toIntendedRole(invite.intendedRole),
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/** 接受邀请：绑定 + 消费 + 激活 + 建会话。sessionUserId 来自当前 portal 会话（mode=existing 必需）。 */
export async function accept(input: AcceptInput, sessionUserId: number | null): Promise<AcceptResult> {
  const now = new Date();
  const invite = await requireValidInvite(input.token, now);

  let userId: number | null;
  let newUser: { email: string; passwordHash: string; nickName: string; country: string } | undefined;

  if (input.mode === "existing") {
    if (sessionUserId === null) throw new BusinessError(ERR_OB_NOT_AUTHENTICATED, 401);
    // 成员去重（含事务前预检 + 事务内并发兜底）统一落在 repo.bindInvite，已是成员则抛 ALREADY_MEMBER。
    userId = sessionUserId;
  } else {
    // register：email 恒取邀请邮箱；已占用则引导转登录。
    if (await repo.findUserByEmail(invite.inviteEmail)) {
      throw new BusinessError(ERR_OB_EMAIL_TAKEN, 409);
    }
    userId = null;
    const newPassword = await decryptAndValidatePassword(input.encryptedPassword, now, ERR_OB_PASSWORD_WEAK);
    newUser = {
      email: invite.inviteEmail,
      passwordHash: await hashPassword(newPassword),
      nickName: input.displayName,
      country: input.country,
    };
  }

  const inviterName = await repo.resolveInviterName(invite.inviterUserId);
  const { userId: boundUserId } = await repo.bindInvite({
    inviteId: invite.operatorInviteId,
    partyId: invite.partyId,
    userId,
    newUser,
    roles: invite.intendedRole,
    inviterUserId: invite.inviterUserId,
    inviterName,
    now,
  });

  // 建/重建会话并按 party 的 portal 组跳对应 console（复用登录收尾；新用户恰好 1 party→直达）。
  const { redirectTo } = await buildSessionAndRedirect(boundUserId, ERR_OB_NOT_AUTHENTICATED);
  return { redirectTo };
}
