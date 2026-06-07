import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { ERR_ACCOUNT_MFA_STEPUP_INVALID } from "@/lib/account-error-codes";
import { disableMfaSchema } from "@/service/account/schemas/account.schema";
import { disableAccountMfa } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Disable MFA (step-up required). Verifies a current TOTP code, then clears
 * mfaEnable and deletes the user's MFA factors. Login-only.
 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = disableMfaSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_MFA_STEPUP_INVALID);

  return successResponse(await disableAccountMfa(session, parsed.data));
});
