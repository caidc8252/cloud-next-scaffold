import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { ERR_ACCOUNT_EMAIL_INVALID } from "@/lib/account-error-codes";
import { requestCodeSchema } from "@/service/account/schemas/account.schema";
import { requestVerifyCode } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Issue a verification code for an identity change (email / username). The code
 * is stored in Redis (TTL 10 min) and delivered out-of-band; never returned in
 * the response. Login-only.
 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = requestCodeSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_EMAIL_INVALID);

  return successResponse(await requestVerifyCode(session, parsed.data));
});
