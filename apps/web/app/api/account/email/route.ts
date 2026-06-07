import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { ERR_ACCOUNT_EMAIL_INVALID } from "@/lib/account-error-codes";
import { changeEmailSchema } from "@/service/account/schemas/account.schema";
import { changeEmail } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Apply a verified email change. Requires codes for both the current email
 * (EMAIL_CURRENT) and the new email (EMAIL_NEW); enforces uniqueness, then
 * rebuilds the session snapshot. Login-only.
 */
export const PATCH = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = changeEmailSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_EMAIL_INVALID);

  return successResponse(await changeEmail(session, parsed.data));
});
