import "server-only";

import { verifyPassword, decryptRsaOaep } from "@cloud/security/server";
import { getAuthConfig } from "@cloud/config";
import { createSession, updateSession, createSessionHandoffToken } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import {
  ERR_AUTH_ACCOUNT_DISABLED,
  ERR_AUTH_ACCOUNT_LOCKED,
  ERR_AUTH_ENCRYPTION_INVALID,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_INVALID_PARTNER,
  ERR_AUTH_MFA_CODE_INVALID,
  ERR_AUTH_MFA_LOCKED,
  ERR_AUTH_MFA_NOT_CONFIGURED,
  ERR_AUTH_MFA_TOKEN_INVALID,
  ERR_AUTH_NOT_AUTHENTICATED,
  ERR_AUTH_REQUEST_EXPIRED,
} from "@/lib/auth-error-codes";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import {
  isAccountActive,
  isLockActive,
  isTimestampFresh,
  computeFailureUpdate,
} from "@/lib/login-checks";
import { createMfaLoginToken, readMfaLoginToken, deleteMfaLoginToken } from "@/lib/login-token";
import { consumeLoginNonce } from "@/lib/login-nonce";
import { resolvePortalGroup } from "@cloud/platform-config";
import { entryUrlForParty } from "@/lib/platform-routing";
import { listPartyChoices } from "./partner-choices";
import { isPartySelectable } from "@/service/auth/partner-choice";
import * as mfa from "@/service/mfa/server/mfa.service";
import { loginPayloadSchema, type LoginInput, type MfaVerifyInput } from "@/service/auth/schemas/auth.schema";
import * as authRepository from "./auth.repository";

// auth 域业务编排：登录（含刷错锁 / RSA 解密 / MFA 分岔）、MFA 二次校验、选择 partner。
// portal 是统一登录入口：成功后跨 host 跳 admin，需用一次性 handoff token 让目标 host 自己写 sid cookie。
// 公开流程，无既有会话；partial session 的读取（getPartialSession）由 route 做，service 只在成功时建/更新会话。

export type LoginResult = { mfaRequired: true; mfaToken: string } | { redirectTo: string };

/** 登录完成的公共收尾：按「可选 partner 数」聚合 → 建会话 → 决定落地路由。
 *  onboarding 接受邀请后也复用它（新用户恰好 1 party→直达 console）。 */
export async function buildSessionAndRedirect(userId: number, snapshotFailCode: string): Promise<{ redirectTo: string }> {
  const choices = await listPartyChoices(userId);
  const selectable = choices.filter(isPartySelectable);
  const currentPartyId = selectable.length === 1 ? selectable[0].partyId : null;

  const snapshot = await buildSessionSnapshot(userId, currentPartyId);
  if (!snapshot) throw new BusinessError(snapshotFailCode, 401);

  const sid = await createSession(snapshot);
  // 直达目标 console 前先签发交接 token，让目标 host 自己写 sid cookie（方案 B）；
  // currentPartyId 落不下来（多选/零选/授权窗口失效）→ 去选择页，不签 token。
  const group = snapshot.currentPartyId !== null ? resolvePortalGroup(snapshot.contractTypes) : null;
  const handoffToken = group ? await createSessionHandoffToken(sid) : null;

  return {
    redirectTo: handoffToken && group ? entryUrlForParty(group, handoffToken) : "/select-partner",
  };
}

/** 带 returnTo 的登录收尾（onboarding 用）：只建 portal 会话（不跨 host handoff），跳回站内 returnTo。
 *  回到邀请页后该会话即「已登录」，可走 accept(mode=existing)。 */
async function establishSessionForReturn(
  userId: number,
  returnTo: string,
  snapshotFailCode: string,
): Promise<{ redirectTo: string }> {
  const snapshot = await buildSessionSnapshot(userId, null);
  if (!snapshot) throw new BusinessError(snapshotFailCode, 401);
  await createSession(snapshot);
  return { redirectTo: returnTo };
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const auth = getAuthConfig();
  const now = new Date();

  const user = await authRepository.findUserByEmail(input.email);
  if (!user) throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS, 401);

  // 账号状态正常性（status 只管账号级；刷错锁不再写 status）
  if (!isAccountActive(user.status)) throw new BusinessError(ERR_AUTH_ACCOUNT_DISABLED, 403);
  // 刷错锁（仅看时间戳）；过期不重置次数、不清时间戳，直接继续
  if (isLockActive(user.passwordErrorLockExpiredTimestamp, now)) {
    throw new BusinessError(ERR_AUTH_ACCOUNT_LOCKED, 403);
  }

  let payload: { password: string; timestamp: number; nonce: string };
  try {
    payload = loginPayloadSchema.parse(
      JSON.parse(decryptRsaOaep(input.encryptedPassword, auth.rsaPrivateKey)),
    );
  } catch {
    throw new BusinessError(ERR_AUTH_ENCRYPTION_INVALID);
  }

  if (!isTimestampFresh(payload.timestamp, now.getTime(), auth.timestampWindowMs)) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }

  // 防重放：nonce 单次消费（由 login-challenge 下发）；取不到 = 重放或过期。
  if (!(await consumeLoginNonce(payload.nonce))) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }

  if (!(await verifyPassword(user.passwordHash, payload.password))) {
    const update = computeFailureUpdate(
      user.passwordErrorTimes,
      auth.maxPasswordErrorTimes,
      auth.lockDurationMinutes,
      now,
    );
    await authRepository.recordLoginFailure(user.userId, update);
    throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS, 401);
  }

  // 成功是唯一清零点
  await authRepository.recordLoginSuccess(user.userId, now);

  // MFA 分岔：开通则发临时 token、不建正式 session（returnTo 随票据透传，MFA 通过后再用）
  if (user.mfaEnable) {
    const mfaToken = await createMfaLoginToken(user.userId, input.returnTo);
    return { mfaRequired: true, mfaToken };
  }

  if (input.returnTo) {
    return establishSessionForReturn(user.userId, input.returnTo, ERR_AUTH_INVALID_CREDENTIALS);
  }
  return buildSessionAndRedirect(user.userId, ERR_AUTH_INVALID_CREDENTIALS);
}

export async function verifyMfa(input: MfaVerifyInput): Promise<{ redirectTo: string }> {
  const entry = await readMfaLoginToken(input.mfaToken);
  if (entry === null) throw new BusinessError(ERR_AUTH_MFA_TOKEN_INVALID, 401);
  const { userId, returnTo } = entry;

  const user = await authRepository.findUserById(userId);
  if (!user || user.status !== "ACTIVE" || !user.mfaEnable) {
    throw new BusinessError(ERR_AUTH_MFA_TOKEN_INVALID, 401);
  }

  const result = await mfa.verifyActiveTotp(userId, input.code);
  if (result === "none") throw new BusinessError(ERR_AUTH_MFA_NOT_CONFIGURED, 409);
  if (result === "locked") throw new BusinessError(ERR_AUTH_MFA_LOCKED, 423);
  if (result === "invalid") throw new BusinessError(ERR_AUTH_MFA_CODE_INVALID, 401);

  // mfaToken 是一次性票据，TOTP 通过后立即删除，避免同一二段登录票据复用
  await deleteMfaLoginToken(input.mfaToken);
  if (returnTo) return establishSessionForReturn(userId, returnTo, ERR_AUTH_MFA_TOKEN_INVALID);
  return buildSessionAndRedirect(userId, ERR_AUTH_MFA_TOKEN_INVALID);
}

/** 选择登录 partner：校验归属有效 → 重建带 partner 的会话快照 → 更新会话 → 跨 host 交接到 admin。 */
export async function selectPartner(userId: number, partyId: number): Promise<{ redirectTo: string }> {
  const membership = await authRepository.findPartyMembership(partyId, userId);
  if (!membership || membership.status !== "ACTIVE" || membership.partner.status !== "ACTIVE") {
    throw new BusinessError(ERR_AUTH_INVALID_PARTNER);
  }

  const snapshot = await buildSessionSnapshot(userId, partyId);
  if (!snapshot || snapshot.currentPartyId === null) {
    throw new BusinessError(ERR_AUTH_INVALID_PARTNER);
  }

  await updateSession(snapshot);
  // 选定后按 party 的 portal 组跳对应 console；一次性 token 完成跨 host 会话交接（方案 B）。
  const group = resolvePortalGroup(snapshot.contractTypes);
  if (!group) throw new BusinessError(ERR_AUTH_INVALID_PARTNER);
  const handoffToken = await createSessionHandoffToken();
  if (!handoffToken) throw new BusinessError(ERR_AUTH_NOT_AUTHENTICATED, 401);

  return { redirectTo: entryUrlForParty(group, handoffToken) };
}
