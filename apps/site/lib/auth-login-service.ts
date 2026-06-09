import "server-only";

import { z } from "zod";
import { prisma } from "@cloud/db";
import { getAuthConfig } from "@cloud/config";
import { createSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { successResponse } from "@cloud/request/server";
import { decryptRsaOaep, verifyPassword } from "@cloud/security/server";
import {
  ERR_AUTH_ACCOUNT_DISABLED,
  ERR_AUTH_ACCOUNT_LOCKED,
  ERR_AUTH_CREDENTIALS_REQUIRED,
  ERR_AUTH_ENCRYPTION_INVALID,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_MFA_CODE_INVALID,
  ERR_AUTH_MFA_LOCKED,
  ERR_AUTH_MFA_NOT_CONFIGURED,
  ERR_AUTH_MFA_TOKEN_INVALID,
  ERR_AUTH_REQUEST_EXPIRED,
} from "./auth-error-codes";
import {
  computeFailureUpdate,
  isAccountActive,
  isLockActive,
  isTimestampFresh,
} from "./login-checks";
import {
  createMfaLoginToken,
  deleteMfaLoginToken,
  readMfaLoginToken,
} from "./login-token";
import { buildSessionSnapshot } from "./session-snapshot";
import { verifyActiveTotp } from "./mfa-service";

const loginSchema = z.object({
  account: z.string().trim().min(1),
  encryptedPassword: z.string().min(1),
});

const payloadSchema = z.object({
  password: z.string().min(1),
  timestamp: z.number().int().positive(),
});

const mfaSchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().trim().length(6),
});

function redirectForPartnerCount(partnerCount: number): string {
  return partnerCount > 0 ? "/select-partner" : "/locked";
}

// 登录第一段只证明“账号密码正确”。开启 MFA 时不能提前创建 session，
// 只签发短期 mfaToken，等第二段 TOTP 通过后再进入 partner 选择。
export async function loginWithPassword(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessError(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const auth = getAuthConfig();
  const now = new Date();

  const user = await prisma.sysUser.findUnique({
    where: { username: parsed.data.account },
  });
  if (!user) {
    throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS, 401);
  }

  if (!isAccountActive(user.status)) {
    throw new BusinessError(ERR_AUTH_ACCOUNT_DISABLED, 403);
  }

  if (isLockActive(user.passwordErrorLockExpiredTimestamp, now)) {
    throw new BusinessError(ERR_AUTH_ACCOUNT_LOCKED, 403);
  }

  let payload: z.infer<typeof payloadSchema>;
  try {
    const decrypted = decryptRsaOaep(parsed.data.encryptedPassword, auth.rsaPrivateKeyPem);
    payload = payloadSchema.parse(JSON.parse(decrypted));
  } catch {
    throw new BusinessError(ERR_AUTH_ENCRYPTION_INVALID);
  }

  if (!isTimestampFresh(payload.timestamp, now.getTime(), auth.timestampWindowMs)) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }

  const isValid = await verifyPassword(user.passwordHash, payload.password);
  if (!isValid) {
    const update = computeFailureUpdate(
      user.passwordErrorTimes,
      auth.maxPasswordErrorTimes,
      auth.lockDurationMinutes,
      now,
    );
    await prisma.sysUser.update({
      where: { userId: user.userId },
      data: {
        passwordErrorTimes: update.passwordErrorTimes,
        passwordErrorLockExpiredTimestamp: update.passwordErrorLockExpiredTimestamp,
      },
    });
    throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS, 401);
  }

  await prisma.sysUser.update({
    where: { userId: user.userId },
    data: {
      passwordErrorTimes: 0,
      passwordErrorLockExpiredTimestamp: null,
      lastLoginAt: now,
    },
  });

  if (user.mfaEnable) {
    const mfaToken = await createMfaLoginToken(user.userId);
    return successResponse({ mfaRequired: true, mfaToken });
  }

  // 这里仍是 partial session：包含用户和可选 partner 列表，但还没有
  // currentPartnerId / permissions。选择 partner 后才升级为完整后台 session。
  const snapshot = await buildSessionSnapshot(user.userId);
  if (!snapshot) {
    throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS, 401);
  }
  await createSession(snapshot);

  return successResponse({ redirectTo: redirectForPartnerCount(snapshot.partners.length) });
}

export async function loginWithMfa(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = mfaSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_AUTH_MFA_CODE_INVALID, 401);

  const userId = await readMfaLoginToken(parsed.data.mfaToken);
  if (userId === null) throw new BusinessError(ERR_AUTH_MFA_TOKEN_INVALID, 401);

  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE" || !user.mfaEnable) {
    throw new BusinessError(ERR_AUTH_MFA_TOKEN_INVALID, 401);
  }

  const result = await verifyActiveTotp(userId, parsed.data.code);
  if (result === "none") throw new BusinessError(ERR_AUTH_MFA_NOT_CONFIGURED, 409);
  if (result === "locked") throw new BusinessError(ERR_AUTH_MFA_LOCKED, 423);
  if (result === "invalid") throw new BusinessError(ERR_AUTH_MFA_CODE_INVALID, 401);

  // mfaToken 是一次性票据，TOTP 通过后立即删除，避免同一个二段登录票据复用。
  await deleteMfaLoginToken(parsed.data.mfaToken);

  const snapshot = await buildSessionSnapshot(userId);
  if (!snapshot) throw new BusinessError(ERR_AUTH_MFA_TOKEN_INVALID, 401);
  await createSession(snapshot);

  return successResponse({ redirectTo: redirectForPartnerCount(snapshot.partners.length) });
}
