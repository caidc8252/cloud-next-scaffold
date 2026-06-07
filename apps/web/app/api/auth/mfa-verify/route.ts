import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { ERR_AUTH_MFA_CODE_INVALID } from "@/lib/auth-error-codes";
import { mfaVerifySchema } from "@/service/auth/schemas/auth.schema";
import { verifyMfa } from "@/service/auth/server/auth.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Login second stage — verify the MFA code and complete sign-in.
 *
 * Gated by the one-time mfaToken from the password stage (not session-auth).
 * Verifies against ALL ACTIVE factors; wrong codes don't burn the token (brute
 * force bounded by the SysMfaInfo failTimes lockout).
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = mfaVerifySchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_AUTH_MFA_CODE_INVALID, 401);

  return successResponse(await verifyMfa(parsed.data));
});
