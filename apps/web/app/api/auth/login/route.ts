import { z } from "zod";
import { prisma } from "@cloud/db";
import { verifyPassword, decryptRsaOaep } from "@cloud/security/server";
import { getAuthConfig } from "@cloud/config";
import { createSession } from "@cloud/permissions/server";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { successResponse, badRequestResponse, errorResponse } from "@cloud/request/server";
import {
  ERR_AUTH_ACCOUNT_LOCKED,
  ERR_AUTH_ACCOUNT_DISABLED,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_CREDENTIALS_REQUIRED,
  ERR_AUTH_ENCRYPTION_INVALID,
  ERR_AUTH_REQUEST_EXPIRED,
} from "@/lib/auth-error-codes";
import "@/lib/auth-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import {
  isAccountActive,
  isLockActive,
  isTimestampFresh,
  computeFailureUpdate,
} from "@/lib/login-checks";
import { createMfaLoginToken } from "@/lib/login-token";

const loginSchema = z.object({
  account: z.string().trim().min(1),
  encryptedPassword: z.string().min(1),
});

const payloadSchema = z.object({
  password: z.string().min(1),
  timestamp: z.number().int().positive(),
});

/** @e2e-cell feature=auth kind=auth-boundary */
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequestResponse(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const auth = getAuthConfig();
  const now = new Date();

  const user = await prisma.sysUser.findUnique({
    where: { username: parsed.data.account },
  });
  if (!user) {
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, undefined, 401);
  }

  // 3. 账号状态正常性（status 只管账号级；刷错锁不再写 status）
  if (!isAccountActive(user.status)) {
    return errorResponse(ERR_AUTH_ACCOUNT_DISABLED, undefined, 403);
  }

  // 4. 刷错锁（仅看时间戳）；过期不重置次数、不清时间戳，直接继续
  if (isLockActive(user.passwordErrorLockExpiredTimestamp, now)) {
    return errorResponse(ERR_AUTH_ACCOUNT_LOCKED, undefined, 403);
  }

  // 5. 私钥解密 + 结构校验
  let payload: z.infer<typeof payloadSchema>;
  try {
    const decrypted = decryptRsaOaep(parsed.data.encryptedPassword, auth.rsaPrivateKeyPem);
    payload = payloadSchema.parse(JSON.parse(decrypted));
  } catch {
    return badRequestResponse(ERR_AUTH_ENCRYPTION_INVALID);
  }

  // 6. 60s 时间窗
  if (!isTimestampFresh(payload.timestamp, now.getTime(), auth.timestampWindowMs)) {
    return badRequestResponse(ERR_AUTH_REQUEST_EXPIRED);
  }

  // 7. 密码校验（argon2id）
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
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, undefined, 401);
  }

  // 成功是唯一清零点
  await prisma.sysUser.update({
    where: { userId: user.userId },
    data: {
      passwordErrorTimes: 0,
      passwordErrorLockExpiredTimestamp: null,
      lastLoginAt: now,
    },
  });

  // 8. MFA 分岔：开通则发临时 token、不建正式 session
  if (user.mfaEnable) {
    const mfaToken = await createMfaLoginToken(user.userId);
    return successResponse({ mfaRequired: true, mfaToken });
  }

  // 未开通 MFA：聚合 partner，建会话
  const partnerUsers = await prisma.sysPartnerUser.findMany({
    where: { userId: user.userId },
    include: { partner: true },
  });
  const activePartnerUsers = partnerUsers.filter(
    (eu) => eu.status === "ACTIVE" && eu.partner.status === "ACTIVE",
  );
  const currentPartnerId =
    activePartnerUsers.length === 1 ? activePartnerUsers[0].partnerId : null;
  const snapshot = await buildSessionSnapshot(user.userId, currentPartnerId);
  if (!snapshot) {
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, undefined, 401);
  }
  await createSession(snapshot);

  if (activePartnerUsers.length === 1) {
    return successResponse({ redirectTo: "/" });
  }
  if (activePartnerUsers.length > 1) {
    return successResponse({ redirectTo: "/select-partner" });
  }
  return successResponse({ redirectTo: "/locked" });
});
