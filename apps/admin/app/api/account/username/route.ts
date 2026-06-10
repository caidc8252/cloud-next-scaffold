import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { ERR_ACCOUNT_USERNAME_INVALID } from "@/lib/account-error-codes";
import { changeUsernameSchema } from "@/service/account/schemas/account.schema";
import { changeUsername } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Apply a verified username change. Requires a code sent to the current email
 * (USERNAME_CURRENT); enforces the username regex + uniqueness, then rebuilds
 * the session. Login-only.
 */
export const PATCH = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = changeUsernameSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ACCOUNT_USERNAME_INVALID);

  return successResponse(await changeUsername(session, parsed.data));
});
