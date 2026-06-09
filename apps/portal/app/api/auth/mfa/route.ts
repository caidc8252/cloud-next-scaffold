import { successResponse } from "@cloud/request/server";
import { mfaVerifySchema } from "@/lib/schemas";
import { verifyMfa } from "@/lib/mock/store";
import { setSession } from "@/lib/mock/session";
import { readJson, withApiHandler } from "@/lib/api-handler";

/**
 * Password sign-in, stage 2: two-factor verification. Demo accepts any 6-digit
 * code except "000000"; five rejected codes escalate to a verification lockout.
 * On success either advances to the workspace chooser or completes the session.
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const { loginToken, code } = await readJson(req, mfaVerifySchema);
  const result = verifyMfa(loginToken, code);

  if (result.status === "ok" && result.account) {
    await setSession(result.account);
    return successResponse({ status: "ok", redirectTo: "/dashboard" });
  }
  return successResponse(result);
});
