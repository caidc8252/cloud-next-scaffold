import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { getAccountSecurity } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * The signed-in user's account-security state (MFA flag/status + password meta).
 * Backs the "Account & security" page. Login-only.
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await getAccountSecurity(session.userId));
});
