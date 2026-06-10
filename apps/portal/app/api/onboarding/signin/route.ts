import { successResponse } from "@cloud/request/server";
import { onboardingSigninSchema } from "@/lib/schemas";
import { deriveName, getInvitation } from "@/lib/mock/store";
import { MockHttpError, readJson, withApiHandler } from "@/lib/api-handler";
import { AUTH_SIGNIN_FAILED, INVITE_NOT_FOUND } from "@/lib/error-codes";

/**
 * Onboarding path A: an invitee signs in to an existing account before
 * confirming they want to join the partner. Demo accepts any 6+ char password.
 *
 * @e2e-cell feature=onboarding kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const { token, email } = await readJson(req, onboardingSigninSchema);
  if (!getInvitation(token)) {
    throw new MockHttpError(INVITE_NOT_FOUND, "Invitation not found.", 404);
  }
  if (!email.includes("@")) {
    throw new MockHttpError(AUTH_SIGNIN_FAILED, "Sign-in failed.", 401);
  }
  return successResponse({ account: { name: deriveName(email), email } });
});
