import { successResponse } from "@cloud/request/server";
import { passwordLoginSchema } from "@/lib/schemas";
import { verifyPassword } from "@/lib/mock/store";
import { setSession } from "@/lib/mock/session";
import { MockHttpError, readJson, withApiHandler } from "@/lib/api-handler";
import { AUTH_BAD_CREDENTIALS } from "@/lib/error-codes";

/**
 * Password sign-in, stage 1. Verifies credentials and branches: MFA challenge,
 * workspace chooser, no-company, a blocked state (locked / rate-limited), or a
 * completed session. Demo scenarios are keyed off the email local-part and the
 * sentinel password "wrongpw".
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const { email, password } = await readJson(req, passwordLoginSchema);
  const result = verifyPassword(email, password);

  if (result.status === "badpw") {
    throw new MockHttpError(AUTH_BAD_CREDENTIALS, "Your email or password is incorrect.", 401);
  }
  if (result.status === "ok" && result.account) {
    await setSession(result.account);
    return successResponse({ status: "ok", redirectTo: "/dashboard" });
  }
  return successResponse(result);
});
