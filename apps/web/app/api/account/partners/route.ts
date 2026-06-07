import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { listPartners } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * The partners (companies) the signed-in user belongs to — for "Switch partner".
 * Login-only. Switching itself reuses POST /api/auth/select-partner.
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await listPartners(session.userId, session.currentPartnerId));
});
