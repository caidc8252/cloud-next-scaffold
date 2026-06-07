import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import {
  ERR_ACCOUNT_NICKNAME_REQUIRED,
  ERR_ACCOUNT_COUNTRY_INVALID,
} from "@/lib/account-error-codes";
import { updateProfileSchema } from "@/service/account/schemas/account.schema";
import { getProfile, updateProfile } from "@/service/account/server/account.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * The signed-in user's own profile (display name, country, sign-in identity).
 * Login-only — every authenticated user manages their own profile.
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse(await getProfile(session.userId));
});

/**
 * Update the signed-in user's editable profile fields (display name, country).
 * Rebuilds the session snapshot so the top bar reflects a renamed nickName.
 */
export const PATCH = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const hasCountryIssue = parsed.error.issues.some((i) => i.path[0] === "country");
    throw new BusinessError(
      hasCountryIssue ? ERR_ACCOUNT_COUNTRY_INVALID : ERR_ACCOUNT_NICKNAME_REQUIRED,
    );
  }

  return successResponse(await updateProfile(session, parsed.data));
});
