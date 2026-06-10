import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { changePasswordSchema } from "@/service/account/schemas/account.schema";
import { changePassword } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Change the signed-in user's password. Re-auths the current password, requires
 * a step-up TOTP when MFA is on, enforces policy + recent-history reuse, then
 * rotates the hash. Passwords arrive RSA-OAEP encrypted (same transport as login).
 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);

  return successResponse(await changePassword(session, parsed.data));
});
