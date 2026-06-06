import { z } from "zod";
import { prisma } from "@cloud/db";
import { assertPermissions } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import {
  ERR_ACCOUNT_MFA_NOT_ENABLED,
  ERR_ACCOUNT_MFA_STEPUP_INVALID,
} from "@/lib/account-error-codes";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import {
  verifyActiveTotp,
  disableMfa,
  getAccountSecurity,
} from "@/app/(portal)/account/_server/mfa-service";

/**
 * Disable MFA (step-up required).
 *
 * Verifies a current TOTP code, then clears mfaEnable and deletes the user's
 * MFA factors. Login-only.
 */
const schema = z.object({ code: z.string().trim().length(6) });

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_INVALID);

  const user = await prisma.sysUser.findUniqueOrThrow({
    where: { userId: session.userId },
    select: { mfaEnable: true },
  });
  if (!user.mfaEnable) throw new BusinessError(ERR_ACCOUNT_MFA_NOT_ENABLED);

  const result = await verifyActiveTotp(session.userId, parsed.data.code);
  if (result !== "ok") throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_INVALID);

  await disableMfa(session.userId);
  return successResponse(await getAccountSecurity(session.userId));
});
