import { successResponse, notFoundResponse } from "@cloud/request/server";
import { getInvitation } from "@/lib/mock/store";
import { withApiHandler } from "@/lib/api-handler";
import { INVITE_NOT_FOUND } from "@/lib/error-codes";

/**
 * Resolve the invitation an invitee landed on from their email link. Returns
 * the partner / contract / roles / expiry, or 404 when the token doesn't match
 * a pending invitation (cancelled, used, or expired).
 *
 * @e2e-cell feature=onboarding kind=route
 */
export const GET = withApiHandler(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const invitation = getInvitation(token);
  if (!invitation) {
    return notFoundResponse(INVITE_NOT_FOUND, "Invitation not found.");
  }
  return successResponse({ invitation });
});
