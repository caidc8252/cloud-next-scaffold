import { successResponse } from "@cloud/request/server";
import { onboardingRegisterSchema } from "@/lib/schemas";
import { getInvitation } from "@/lib/mock/store";
import { MockHttpError, readJson, withApiHandler } from "@/lib/api-handler";
import { INVITE_NOT_FOUND } from "@/lib/error-codes";

/**
 * Onboarding path B: an invitee registers a brand-new account (login name,
 * password, country, display name) before confirming they want to join. The
 * account is materialized only on accept.
 *
 * @e2e-cell feature=onboarding kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const { token, email, displayName, loginName, country } = await readJson(
    req,
    onboardingRegisterSchema,
  );
  if (!getInvitation(token)) {
    throw new MockHttpError(INVITE_NOT_FOUND, "Invitation not found.", 404);
  }
  return successResponse({ account: { name: displayName, email, loginName, country } });
});
