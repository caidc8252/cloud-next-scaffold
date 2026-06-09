import { successResponse } from "@cloud/request/server";
import { onboardingAcceptSchema } from "@/lib/schemas";
import { getCompanies, getInvitation } from "@/lib/mock/store";
import { setSession } from "@/lib/mock/session";
import { MockHttpError, readJson, withApiHandler } from "@/lib/api-handler";
import { INVITE_NOT_FOUND } from "@/lib/error-codes";

/**
 * Onboarding final step: the invitee authorizes joining the partner. Records
 * the membership (mock: maps to the inviting company), issues the session, and
 * sends them into the console.
 *
 * @e2e-cell feature=onboarding kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const { token, email, name } = await readJson(req, onboardingAcceptSchema);
  const invitation = getInvitation(token);
  if (!invitation) {
    throw new MockHttpError(INVITE_NOT_FOUND, "Invitation not found.", 404);
  }
  const company = getCompanies().find((c) => c.name === invitation.partner) ?? getCompanies()[0];
  await setSession({ name, email, company });
  return successResponse({ status: "ok", redirectTo: "/dashboard" });
});
