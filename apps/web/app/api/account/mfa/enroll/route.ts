import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { enrollMfa } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Begin MFA enrollment — Enable (when off) or Reconfigure (when active).
 * Creates/refreshes a PENDING factor and returns the plaintext secret + otpauth
 * URI once (for the QR / setup key). Login-only.
 */
export const POST = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await enrollMfa(session));
});
