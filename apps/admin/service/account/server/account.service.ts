import "server-only";

import { updateSession, type ActiveSession } from "@cloud/permissions/server";
import { verifyPassword, hashPassword, decryptRsaOaep } from "@cloud/security/server";
import { getAuthConfig, getEnv } from "@cloud/config";
import { PASSWORD_POLICY, LOGIN_TIMESTAMP_WINDOW_MS } from "@cloud/constants";
import { BusinessError } from "@cloud/request";
import {
  ERR_ACCOUNT_EMAIL_INVALID,
  ERR_ACCOUNT_EMAIL_SAME,
  ERR_ACCOUNT_EMAIL_TAKEN,
  ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID,
  ERR_ACCOUNT_MFA_NOT_ENABLED,
  ERR_ACCOUNT_MFA_PENDING_MISSING,
  ERR_ACCOUNT_MFA_STEPUP_INVALID,
  ERR_ACCOUNT_MFA_STEPUP_REQUIRED,
  ERR_ACCOUNT_PASSWORD_CURRENT_WRONG,
  ERR_ACCOUNT_PASSWORD_POLICY,
  ERR_ACCOUNT_PASSWORD_REUSED,
  ERR_ACCOUNT_VERIFY_CODE_INVALID,
} from "@/lib/account-error-codes";
import { ERR_AUTH_ENCRYPTION_INVALID, ERR_AUTH_REQUEST_EXPIRED } from "@/lib/auth-error-codes";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { isTimestampFresh } from "@/lib/login-checks";
import {
  meetsPasswordPolicy,
  recentPasswordHashes,
  buildNextPasswordHistory,
} from "@/lib/password-rules";
import {
  readVerifyCode,
  consumeVerifyCode,
  issueVerifyCode,
} from "@/lib/account-verify-code";
import { sendVerifyCodeEmail } from "@/lib/email";
import * as mfa from "@/service/mfa/server/mfa.service";
import type {
  AccountProfile,
  AccountSecurity,
  AccountPartner,
} from "@/app/(portal)/account/_shared/types";
import type {
  ActivateMfaInput,
  ChangeEmailInput,
  ChangePasswordInput,
  DisableMfaInput,
  RequestCodeInput,
  UpdateProfileInput,
} from "@/service/account/schemas/account.schema";
import { passwordPayloadSchema } from "@/service/account/schemas/account.schema";
import { toAccountProfile } from "./account.mapper";
import * as accountRepository from "./account.repository";

// account 域业务编排。入参为「已解析的类型化数据 + 当前会话」,可预期错误一律 throw BusinessError。
// MFA 因子生命周期复用 service/mfa;account 在此基础上拼出 account 维度的安全态 / step-up。

/** 改身份后重建会话快照,让顶栏 / 用户卡无需重登即反映新昵称 / 用户名。 */
async function refreshSession(session: ActiveSession): Promise<void> {
  const snapshot = await buildSessionSnapshot(session.userId, session.currentPartyId);
  if (snapshot) await updateSession(snapshot);
}

export async function getProfile(userId: number): Promise<AccountProfile> {
  return toAccountProfile(await accountRepository.getUser(userId));
}

export async function updateProfile(
  session: ActiveSession,
  input: UpdateProfileInput,
): Promise<AccountProfile> {
  const data: { nickName?: string; country?: string | null } = {};
  if (input.nickName !== undefined) data.nickName = input.nickName;
  if (input.country !== undefined) data.country = input.country;

  const user = await accountRepository.updateUser(session.userId, data);
  await refreshSession(session);
  return toAccountProfile(user);
}

export async function changeEmail(
  session: ActiveSession,
  input: ChangeEmailInput,
): Promise<AccountProfile> {
  const user = await accountRepository.getUser(session.userId);

  const current = await readVerifyCode(session.userId, "EMAIL_CURRENT");
  if (!current || current.code !== input.currentCode) {
    throw new BusinessError(ERR_ACCOUNT_VERIFY_CODE_INVALID);
  }

  const next = await readVerifyCode(session.userId, "EMAIL_NEW");
  if (
    !next ||
    next.code !== input.newCode ||
    (next.newEmail ?? "").toLowerCase() !== input.newEmail.toLowerCase()
  ) {
    throw new BusinessError(ERR_ACCOUNT_VERIFY_CODE_INVALID);
  }

  if (input.newEmail.toLowerCase() === user.email.toLowerCase()) {
    throw new BusinessError(ERR_ACCOUNT_EMAIL_SAME);
  }

  const taken = await accountRepository.findUserByEmail(input.newEmail, session.userId);
  if (taken) throw new BusinessError(ERR_ACCOUNT_EMAIL_TAKEN, 409);

  const updated = await accountRepository.updateUser(session.userId, { email: input.newEmail });
  await consumeVerifyCode(session.userId, "EMAIL_CURRENT");
  await consumeVerifyCode(session.userId, "EMAIL_NEW");
  await refreshSession(session);
  return toAccountProfile(updated);
}

export async function changePassword(
  session: ActiveSession,
  input: ChangePasswordInput,
): Promise<{ changed: true }> {
  const auth = getAuthConfig();
  const now = Date.now();
  // 解密 + 结构校验只在 try 里;时间窗校验放到 try 外——否则 REQUEST_EXPIRED 的 throw
  // 会被本 try 的 catch 吞掉、误判成 ENCRYPTION_INVALID。
  let cur: { password: string; timestamp: number };
  let next: { password: string; timestamp: number };
  try {
    cur = passwordPayloadSchema.parse(
      JSON.parse(decryptRsaOaep(input.encryptedCurrentPassword, auth.rsaPrivateKey)),
    );
    next = passwordPayloadSchema.parse(
      JSON.parse(decryptRsaOaep(input.encryptedNewPassword, auth.rsaPrivateKey)),
    );
  } catch {
    throw new BusinessError(ERR_AUTH_ENCRYPTION_INVALID);
  }
  if (
    !isTimestampFresh(cur.timestamp, now, LOGIN_TIMESTAMP_WINDOW_MS) ||
    !isTimestampFresh(next.timestamp, now, LOGIN_TIMESTAMP_WINDOW_MS)
  ) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }
  const currentPassword = cur.password;
  const newPassword = next.password;

  const user = await accountRepository.getUser(session.userId);

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new BusinessError(ERR_ACCOUNT_PASSWORD_CURRENT_WRONG);
  }

  if (user.mfaEnable) {
    if (!input.mfaCode) throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_REQUIRED);
    const result = await mfa.verifyActiveTotp(session.userId, input.mfaCode);
    if (result !== "ok") throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_INVALID);
  }

  if (!meetsPasswordPolicy(newPassword)) throw new BusinessError(ERR_ACCOUNT_PASSWORD_POLICY);

  const history = Array.isArray(user.passwordHistory) ? (user.passwordHistory as string[]) : [];
  for (const hash of recentPasswordHashes(user.passwordHash, history)) {
    if (await verifyPassword(hash, newPassword)) throw new BusinessError(ERR_ACCOUNT_PASSWORD_REUSED);
  }

  const newHash = await hashPassword(newPassword);
  const newHistory = buildNextPasswordHistory(user.passwordHash, history);
  await accountRepository.updateUser(session.userId, {
    passwordHash: newHash,
    passwordChangedTimestamp: new Date(),
    passwordHistory: newHistory,
  });

  return { changed: true };
}

export async function requestVerifyCode(
  session: ActiveSession,
  input: RequestCodeInput,
): Promise<{ sent: true }> {
  if (input.purpose === "EMAIL_NEW" && !input.newEmail) {
    throw new BusinessError(ERR_ACCOUNT_EMAIL_INVALID);
  }
  const user = await accountRepository.getUser(session.userId);
  const address = input.purpose === "EMAIL_NEW" ? input.newEmail! : user.email;
  const code = await issueVerifyCode(
    session.userId,
    input.purpose,
    input.purpose === "EMAIL_NEW" ? { newEmail: input.newEmail } : undefined,
  );
  // EMAIL_CURRENT / EMAIL_NEW 都属"改邮箱"场景 → emailChange 文案。
  await sendVerifyCodeEmail({ to: address, code, intent: "emailChange" });
  return { sent: true };
}

/** 用户归属的全部 partner（含 LOCKED）+ 各自非终止契约类型。排序：当前优先、其次 ACTIVE、LOCKED 最后。 */
export async function listPartners(
  userId: number,
  currentPartyId: number | null,
): Promise<AccountPartner[]> {
  const rows = await accountRepository.listPartyMemberships(userId);
  const partyIds = rows.map((row) => row.partyId);
  const contracts = partyIds.length
    ? await accountRepository.listActiveContractTypes(partyIds)
    : [];

  const typesByPartner = new Map<number, string[]>();
  for (const contract of contracts) {
    const list = typesByPartner.get(contract.authorizedPartyId) ?? [];
    if (!list.includes(contract.authorizedContractType)) list.push(contract.authorizedContractType);
    typesByPartner.set(contract.authorizedPartyId, list);
  }

  const data: AccountPartner[] = rows.map((row) => ({
    partyUserId: row.partyUserId,
    partyId: row.partyId,
    partyName: row.partner.partyName,
    authorizingType: row.authorizingType === "ADMIN" ? "ADMIN" : "NORMAL",
    authorizingTimestamp: row.authorizingTimestamp?.toISOString() ?? null,
    status: row.status,
    locked: row.status !== "ACTIVE",
    contractTypes: typesByPartner.get(row.partyId) ?? [],
    isCurrent: row.partyId === currentPartyId,
  }));

  data.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    if (a.locked !== b.locked) return a.locked ? 1 : -1;
    return 0;
  });

  return data;
}

/** Account & Security 页所需的安全态 VO（MFA 开关/状态 + 密码元信息）。 */
export async function getAccountSecurity(userId: number): Promise<AccountSecurity> {
  const [user, mfaStatus] = await Promise.all([
    accountRepository.getUser(userId),
    mfa.getMfaStatus(userId),
  ]);
  return {
    mfaEnable: user.mfaEnable,
    mfaStatus,
    passwordChangedTimestamp: user.passwordChangedTimestamp?.toISOString() ?? null,
    passwordExpiryDays: PASSWORD_POLICY.expiryDays,
  };
}

export async function enrollMfa(
  session: ActiveSession,
): Promise<{ mfaInfoId: number; secret: string; otpauthUri: string }> {
  const user = await accountRepository.getUser(session.userId);
  const result = await mfa.startEnrollment(session.userId, user.email, getEnv().NEXT_PUBLIC_APP_NAME);
  return { mfaInfoId: result.mfaInfoId, secret: result.secret, otpauthUri: result.otpauthUri };
}

export async function activateMfa(
  session: ActiveSession,
  input: ActivateMfaInput,
): Promise<AccountSecurity> {
  const result = await mfa.activateEnrollment(session.userId, input.mfaInfoId, input.code);
  if (result === "missing") throw new BusinessError(ERR_ACCOUNT_MFA_PENDING_MISSING);
  if (result === "invalid") throw new BusinessError(ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID);
  return getAccountSecurity(session.userId);
}

export async function disableAccountMfa(
  session: ActiveSession,
  input: DisableMfaInput,
): Promise<AccountSecurity> {
  const user = await accountRepository.getUser(session.userId);
  if (!user.mfaEnable) throw new BusinessError(ERR_ACCOUNT_MFA_NOT_ENABLED);

  const result = await mfa.verifyActiveTotp(session.userId, input.code);
  if (result !== "ok") throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_INVALID);

  await mfa.disableMfa(session.userId);
  return getAccountSecurity(session.userId);
}
