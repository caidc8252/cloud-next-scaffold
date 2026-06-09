import { successResponse } from "@cloud/request/server";
import { resetPasswordSchema } from "@/lib/schemas";
import { readJson, withApiHandler } from "@/lib/api-handler";

/**
 * Account recovery, step 3: set the new password (server re-checks the policy
 * minimum) and finish. The client then returns the user to sign-in.
 *
 * @e2e-cell feature=auth kind=route
 */
export const POST = withApiHandler(async (req: Request) => {
  await readJson(req, resetPasswordSchema);
  return successResponse({ ok: true });
});
