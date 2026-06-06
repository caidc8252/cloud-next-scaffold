import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";
import { reconfigureAuthenticator } from "@/app/(portal)/account/_server/account-store";

/**
 * Finalise an authenticator-app reconfiguration.
 *
 * Called once the client-side reconfigure flow has verified the current code,
 * shown the new setup key, and confirmed a code from the new entry. This stub
 * stamps the authenticator as just reconfigured; a real service would store the
 * new TOTP secret.
 */
export const POST = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(reconfigureAuthenticator());
});
