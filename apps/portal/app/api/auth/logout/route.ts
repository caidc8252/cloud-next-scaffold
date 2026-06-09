import { successResponse } from "@cloud/request/server";
import { clearSession } from "@/lib/mock/session";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Sign out: clears the session cookie and points the client back to sign-in.
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async () => {
  await clearSession();
  return successResponse({ redirectTo: "/login" });
});
