import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";
import { revokeApiTokens } from "@/app/(portal)/account/_server/account-store";

/**
 * Revoke all of the signed-in user's personal API tokens (danger zone).
 *
 * Called from the Account & security "Revoke all API tokens" action. This stub
 * zeroes the token count; a real service would invalidate the tokens and write
 * an audit event in the same transaction.
 */
export const POST = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(revokeApiTokens());
});
