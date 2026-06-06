import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";
import { getPartners } from "@/app/(portal)/account/_server/account-store";

/**
 * The partners (entities) the signed-in user belongs to, for "Switch partner".
 *
 * Each item carries its contract-type chips, destination portal, join date,
 * access type and locked state — pre-derived for display. Login-only. A real
 * service would build this from the user's EntityUserRelationship rows joined
 * to each entity's live contracts.
 */
export const GET = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(getPartners());
});
