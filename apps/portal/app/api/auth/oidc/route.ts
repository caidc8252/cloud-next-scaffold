import { successResponse } from "@cloud/request/server";
import { oidcLoginSchema } from "@/lib/schemas";
import { startOidcLogin } from "@/lib/mock/store";
import { setSession } from "@/lib/mock/session";
import { readJson, withApiHandler } from "@/lib/api-handler";

/**
 * Third-party / enterprise OIDC sign-in. The IdP owns MFA, so this resolves
 * straight to the workspace chooser or a completed session after the simulated
 * id_token handshake. Called when the user finishes the IdP account chooser.
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const { email, name, sub } = await readJson(req, oidcLoginSchema);
  const result = startOidcLogin({ name, email, sub });

  if (result.status === "ok" && result.account) {
    await setSession(result.account);
    return successResponse({ status: "ok", redirectTo: "/select-partner" });
  }
  return successResponse(result);
});
