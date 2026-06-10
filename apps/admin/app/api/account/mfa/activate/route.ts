import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID } from "@/lib/account-error-codes";
import { activateMfaSchema } from "@/service/account/schemas/account.schema";
import { activateMfa } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Activate a PENDING enrollment by proving a code from the new authenticator.
 * On success the factor becomes ACTIVE, mfaEnable=true, and any previous factor
 * is removed atomically. Login-only.
 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = activateMfaSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID);

  return successResponse(await activateMfa(session, parsed.data));
});
