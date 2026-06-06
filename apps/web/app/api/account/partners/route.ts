import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import "@/lib/account-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { loadAccountPartners } from "@/app/(portal)/account/_server/partner-service";

/**
 * The partners (companies) the signed-in user belongs to — for "Switch partner".
 *
 * All SysPartnerUser rows (incl. LOCKED) ⋈ SysPartner ⋈ non-terminated contract
 * types; `isCurrent` from session.currentPartnerId. Login-only. Switching itself
 * reuses POST /api/auth/select-partner.
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await loadAccountPartners(session.userId, session.currentPartnerId));
});
