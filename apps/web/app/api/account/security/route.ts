import { z } from "zod";
import { assertPermissions } from "@cloud/permissions/server";
import { successResponse, badRequestResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { withApiHandler } from "@/lib/api-handler";
import { getSecurityState, updateSecurityToggles } from "@/app/(portal)/account/_server/account-store";

/**
 * The signed-in user's account-security state.
 *
 * Backs the "Account & security" page: password rotation meta, MFA factors,
 * connected SSO services, and the API-token count. Login-only.
 */
export const GET = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(getSecurityState());
});

// Only the two switch-style settings are flipped through this endpoint; the
// security-critical changes (password, authenticator) have their own flows.
const securityPatchSchema = z
  .object({
    magicLink: z.boolean(),
    smsBackup: z.boolean(),
  })
  .partial();

/**
 * Toggle a low-risk security setting (email login link, SMS backup factor).
 *
 * Called when the user flips one of the switches on the Account & security page.
 */
export const PATCH = withApiHandler(async (req: Request) => {
  await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequestResponse(ERR_INVALID_JSON);
  }

  const parsed = securityPatchSchema.safeParse(raw);
  if (!parsed.success) return badRequestResponse();

  return successResponse(updateSecurityToggles(parsed.data));
});
