import { prisma } from "@cloud/db";
import { getEnv } from "@cloud/config";
import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { startEnrollment } from "@/app/(portal)/account/_server/mfa-service";

/**
 * Begin MFA enrollment — Enable (when off) or Reconfigure (when active).
 *
 * Creates/refreshes a PENDING SysMfaInfo row with a fresh AES-encrypted secret
 * and returns the plaintext secret + otpauth URI once (for the QR / setup key).
 * Login-only.
 */
export const POST = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  const user = await prisma.sysUser.findUniqueOrThrow({
    where: { userId: session.userId },
    select: { email: true },
  });
  const env = getEnv();
  const result = await startEnrollment(session.userId, user.email, env.NEXT_PUBLIC_APP_NAME);
  return successResponse({
    mfaInfoId: result.mfaInfoId,
    secret: result.secret,
    otpauthUri: result.otpauthUri,
  });
});
