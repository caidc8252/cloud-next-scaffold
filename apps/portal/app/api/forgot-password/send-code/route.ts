import { successResponse } from "@cloud/request/server";
import { emailOnlySchema } from "@/lib/schemas";
import { readJson, withApiHandler } from "@/lib/api-handler";

/**
 * Account recovery, step 1: send a 6-digit verification code to the account
 * email. Mock always "sends" (no enumeration signal) and starts a resend
 * cooldown on the client.
 *
 * @e2e-cell feature=auth kind=route
 */
export const POST = withApiHandler(async (req: Request) => {
  await readJson(req, emailOnlySchema);
  return successResponse({ ok: true, cooldownSeconds: 30 });
});
