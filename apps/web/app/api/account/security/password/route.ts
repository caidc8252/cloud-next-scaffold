import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";
import { recordPasswordChange } from "@/app/(portal)/account/_server/account-store";

/**
 * Finalise a password rotation.
 *
 * Called once the client-side change-password flow has re-authenticated the
 * user (current password → step-up MFA if enabled → new password). This stub
 * records the rotation (resets "last changed" / "expires in") and returns the
 * updated security state; a real service would persist the new password hash.
 */
export const POST = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(recordPasswordChange());
});
