import { successResponse } from "@cloud/request/server";
import { companySelectSchema } from "@/lib/schemas";
import { selectCompany } from "@/lib/mock/store";
import { setSession } from "@/lib/mock/session";
import { MockHttpError, readJson, withApiHandler } from "@/lib/api-handler";
import { AUTH_SIGNIN_FAILED } from "@/lib/error-codes";

/**
 * Final sign-in step when a login maps to several workspaces: the operator
 * picks one company, scoping their role, and the session is issued.
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const { loginToken, companyId } = await readJson(req, companySelectSchema);
  const account = selectCompany(loginToken, companyId);
  if (!account) {
    throw new MockHttpError(AUTH_SIGNIN_FAILED, "Sign-in session expired.", 401);
  }
  await setSession(account);
  return successResponse({ status: "ok", redirectTo: "/select-partner" });
});
