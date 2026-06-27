import "server-only";

import { verifyPassword, decryptRsaOaep } from "@cloud/security/server";
import { getConfig } from "@cloud/config";
import { PASSWORD_POLICY, LOGIN_TIMESTAMP_WINDOW_MS } from "@cloud/constants";
import { createSession, updateSession } from "@cloud/permissions/server";
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
import { listPartyChoices } from "./partner-choices";
import { isPartySelectable } from "./partner-choice";
import * as mfa from "@/modules/identity/mfa/server/mfa.public";
import { loginPayloadSchema, type LoginInput, type MfaVerifyInput } from "../schema/auth.schema";
import * as authRepository from "./auth.repository";

// auth 域业务编排：登录（含刷错锁 / RSA 解密 / MFA 分岔）、MFA 二次校验、选择公司。
// 公开流程，无既有会话；session 读取（getPartialSession）由 route 做，service 只在成功时建/更新会话。

export type LoginResult = { mfaRequired: true; mfaToken: string } | { redirectTo: string };

/** 登录完成的公共收尾：按「可选 partner 数」聚合 → 建会话 → 决定落地路由。 */
async function buildSessionAndRedirect(userId: number, snapshotFailCode: string): Promise<{ redirectTo: string }> {
  const choices = await listPartyChoices(userId);
  const selectable = choices.filter(isPartySelectable);
  const currentPartyId = selectable.length === 1 ? selectable[0].partyId : null;

  const snapshot = await buildSessionSnapshot(userId, currentPartyId);
  if (!snapshot) throw new BusinessError(snapshotFailCode, 401);
  await createSession(snapshot);
  console.log(snapshot)
  // currentPartyId 落不下来（多选/零选/授权窗口失效）→ 去选择页
  return { redirectTo: snapshot.currentPartyId !== null ? "/" : "/select-partner" };
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const rsaPrivateKey = getConfig().NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY;
  const now = new Date();

  const user = await authRepository.findUserByEmail(input.email);
  if (!user) throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS, 401);

  // 账号状态正常性（status 只管账号级；刷错锁不再写 status）
  if (!isAccountActive(user.status)) throw new BusinessError(ERR_AUTH_ACCOUNT_DISABLED, 403);
  // 刷错锁（仅看时间戳）；过期不重置次数、不清时间戳，直接继续
  if (isLockActive(user.passwordErrorLockExpiredTimestamp, now)) {
    throw new BusinessError(ERR_AUTH_ACCOUNT_LOCKED, 403);
  }

  let payload: { password: string; timestamp: number };
  try {
    payload = loginPayloadSchema.parse(
      JSON.parse(decryptRsaOaep(input.encryptedPassword, rsaPrivateKey)),
    );
  } catch {
    throw new BusinessError(ERR_AUTH_ENCRYPTION_INVALID);
  }

  if (!isTimestampFresh(payload.timestamp, now.getTime(), LOGIN_TIMESTAMP_WINDOW_MS)) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }

  if (!(await verifyPassword(user.passwordHash, payload.password))) {
    const update = computeFailureUpdate(
      user.passwordErrorTimes,
      PASSWORD_POLICY.maxErrorTimes,
      PASSWORD_POLICY.lockDurationMinutes,
      now,
    );
    await authRepository.recordLoginFailure(user.userId, update);
    throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS, 401);
  }

  // 成功是唯一清零点
  await authRepository.recordLoginSuccess(user.userId, now);

  // MFA 分岔：开通则发临时 token、不建正式 session
  if (user.mfaEnable) {
    const mfaToken = await createMfaLoginToken(user.userId);
    return { mfaRequired: true, mfaToken };
  }

  return buildSessionAndRedirect(user.userId, ERR_AUTH_INVALID_CREDENTIALS);
}

export async function verifyMfa(input: MfaVerifyInput): Promise<{ redirectTo: string }> {
  const userId = await readMfaLoginToken(input.mfaToken);
  if (userId === null) throw new BusinessError(ERR_AUTH_MFA_TOKEN_INVALID, 401);

  const user = await authRepository.findUserById(userId);
  if (!user || user.status !== "ACTIVE" || !user.mfaEnable) {
    throw new BusinessError(ERR_AUTH_MFA_TOKEN_INVALID, 401);
  }

  const result = await mfa.verifyActiveTotp(userId, input.code);
  if (result === "none") throw new BusinessError(ERR_AUTH_MFA_NOT_CONFIGURED, 409);
  if (result === "locked") throw new BusinessError(ERR_AUTH_MFA_LOCKED, 423);
  if (result === "invalid") throw new BusinessError(ERR_AUTH_MFA_CODE_INVALID, 401);

  // success → consume the one-time token, then build the real session
  await deleteMfaLoginToken(input.mfaToken);
  return buildSessionAndRedirect(userId, ERR_AUTH_MFA_TOKEN_INVALID);
}

/** 选择登录公司：校验归属有效 → 重建带 partner 的会话快照 → 更新会话。 */
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
  return { redirectTo: "/" };
}
