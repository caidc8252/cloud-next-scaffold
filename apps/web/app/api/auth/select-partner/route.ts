import { getPartialSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_AUTH_PARTNER_REQUIRED, ERR_AUTH_NOT_AUTHENTICATED } from "@/lib/auth-error-codes";
import { selectPartnerSchema } from "@/service/auth/schemas/auth.schema";
import { selectPartner } from "@/service/auth/server/auth.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Pick the active company for a partial (post-login, pre-partner) session and
 * upgrade it to a full session.
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
export const POST = withApiHandler(async (req: Request) => {
  const partial = await getPartialSession();
  if (!partial) throw new BusinessError(ERR_AUTH_NOT_AUTHENTICATED, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_AUTH_PARTNER_REQUIRED);
  }

  const parsed = selectPartnerSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_AUTH_PARTNER_REQUIRED);

  return successResponse(await selectPartner(partial.userId, parsed.data.partyId));
});
