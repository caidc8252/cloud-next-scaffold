import { z } from "zod";
import { prisma } from "@cloud/db";
import { verifyPassword, hashPassword, decryptRsaOaep } from "@cloud/security/server";
import { getAuthConfig } from "@cloud/config";
import { assertPermissions } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import {
  ERR_ACCOUNT_PASSWORD_CURRENT_WRONG,
  ERR_ACCOUNT_PASSWORD_POLICY,
  ERR_ACCOUNT_PASSWORD_REUSED,
  ERR_ACCOUNT_MFA_STEPUP_REQUIRED,
  ERR_ACCOUNT_MFA_STEPUP_INVALID,
} from "@/lib/account-error-codes";
import "@/lib/account-error-messages";
import { ERR_AUTH_REQUEST_EXPIRED, ERR_AUTH_ENCRYPTION_INVALID } from "@/lib/auth-error-codes";
import "@/lib/auth-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { isTimestampFresh } from "@/lib/login-checks";
import { meetsPasswordPolicy, recentPasswordHashes, buildNextPasswordHistory } from "@/lib/password-rules";
import { verifyActiveTotp } from "@/app/(portal)/account/_server/mfa-service";

/**
 * Change the signed-in user's password.
 *
 * Re-auths the current password (argon2), requires a step-up TOTP code when MFA
 * is on, enforces the password policy and recent-history reuse check, then
 * rotates the hash + records history. Passwords arrive RSA-OAEP encrypted (same
 * transport as login).
 */
const bodySchema = z.object({
  encryptedCurrentPassword: z.string().min(1),
  encryptedNewPassword: z.string().min(1),
  mfaCode: z.string().trim().length(6).optional(),
});
const payloadSchema = z.object({ password: z.string().min(1), timestamp: z.number().int().positive() });

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);

  const auth = getAuthConfig();
  const now = Date.now();
  // 解密 + 结构校验只在 try 里;时间窗校验放到 try 外——否则 REQUEST_EXPIRED 的 throw
  // 会被本 try 的 catch 吞掉、误判成 ENCRYPTION_INVALID(原来是 return 才不受影响)。
  let cur: z.infer<typeof payloadSchema>;
  let next: z.infer<typeof payloadSchema>;
  try {
    cur = payloadSchema.parse(JSON.parse(decryptRsaOaep(parsed.data.encryptedCurrentPassword, auth.rsaPrivateKeyPem)));
    next = payloadSchema.parse(JSON.parse(decryptRsaOaep(parsed.data.encryptedNewPassword, auth.rsaPrivateKeyPem)));
  } catch {
    throw new BusinessError(ERR_AUTH_ENCRYPTION_INVALID);
  }
  if (
    !isTimestampFresh(cur.timestamp, now, auth.timestampWindowMs) ||
    !isTimestampFresh(next.timestamp, now, auth.timestampWindowMs)
  ) {
    throw new BusinessError(ERR_AUTH_REQUEST_EXPIRED);
  }
  const currentPassword = cur.password;
  const newPassword = next.password;

  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId: session.userId } });

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new BusinessError(ERR_ACCOUNT_PASSWORD_CURRENT_WRONG);
  }

  if (user.mfaEnable) {
    if (!parsed.data.mfaCode) throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_REQUIRED);
    const result = await verifyActiveTotp(session.userId, parsed.data.mfaCode);
    if (result !== "ok") throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_INVALID);
  }

  if (!meetsPasswordPolicy(newPassword)) throw new BusinessError(ERR_ACCOUNT_PASSWORD_POLICY);

  const history = Array.isArray(user.passwordHistory) ? (user.passwordHistory as string[]) : [];
  for (const hash of recentPasswordHashes(user.passwordHash, history)) {
    if (await verifyPassword(hash, newPassword)) throw new BusinessError(ERR_ACCOUNT_PASSWORD_REUSED);
  }

  const newHash = await hashPassword(newPassword);
  const newHistory = buildNextPasswordHistory(user.passwordHash, history);
  await prisma.sysUser.update({
    where: { userId: session.userId },
    data: { passwordHash: newHash, passwordChangedTimestamp: new Date(), passwordHistory: newHistory },
  });

  return successResponse({ changed: true });
});
