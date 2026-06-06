import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";
import { getHelpContent } from "@/app/(portal)/account/_server/account-store";

/**
 * Help-center content: article categories and popular FAQ entries.
 *
 * Backs the Help page's category grid and FAQ accordion (the page filters the
 * FAQs client-side as the user types). Login-only.
 */
export const GET = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(getHelpContent());
});
