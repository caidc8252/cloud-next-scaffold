import { successResponse } from "@cloud/request/server";
import { listIdpAccounts } from "@/lib/mock/store";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Accounts a third-party IdP would offer in its consent/account-chooser step.
 * Called when the user picks Google / Apple / Microsoft on the sign-in form.
 *
 * @e2e-cell feature=auth kind=route
 */
export const GET = withApiHandler(async (req: Request) => {
  const provider = new URL(req.url).searchParams.get("provider") ?? "google";
  return successResponse({ accounts: listIdpAccounts(provider) });
});
