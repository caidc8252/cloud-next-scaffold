import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_AUTH_CREDENTIALS_REQUIRED } from "@/lib/auth-error-codes";
import { loginSchema } from "@/service/auth/schemas/auth.schema";
import { login } from "@/service/auth/server/auth.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Password sign-in (stage 1). Validates credentials, enforces the failure
 * lockout, and either completes the session or returns a one-time MFA token
 * when the account has MFA enabled.
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_AUTH_CREDENTIALS_REQUIRED);

  return successResponse(await login(parsed.data));
});
