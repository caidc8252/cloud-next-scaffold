import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";
import { getActivity } from "@/app/(portal)/account/_server/account-store";

/**
 * The signed-in user's recent activity, grouped by day, for "My activity".
 *
 * Login-only. A real service would page over the user's audit events for the
 * trailing 30 days.
 */
export const GET = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(getActivity());
});
