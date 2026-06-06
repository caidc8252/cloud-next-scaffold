import { z } from "zod";
import { assertPermissions } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import {
  ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID,
  ERR_ACCOUNT_MFA_PENDING_MISSING,
} from "@/lib/account-error-codes";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { activateEnrollment, getAccountSecurity } from "@/app/(portal)/account/_server/mfa-service";

/**
 * Activate a PENDING enrollment by proving a code from the new authenticator.
 *
 * On success: the row becomes ACTIVE, mfaEnable=true, and any previous factor
 * (reconfigure) is removed — atomically. Login-only.
 */
const schema = z.object({
  mfaInfoId: z.number().int().positive(),
  code: z.string().trim().length(6),
});

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID);

  const result = await activateEnrollment(session.userId, parsed.data.mfaInfoId, parsed.data.code);
  if (result === "missing") throw new BusinessError(ERR_ACCOUNT_MFA_PENDING_MISSING);
  if (result === "invalid") throw new BusinessError(ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID);

  return successResponse(await getAccountSecurity(session.userId));
});
