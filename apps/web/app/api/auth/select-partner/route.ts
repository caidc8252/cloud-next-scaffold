import "@/lib/auth-error-messages";

import { getPartialSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_AUTH_NOT_AUTHENTICATED, ERR_AUTH_PARTNER_REQUIRED } from "@/lib/auth-error-codes";
import { selectPartnerSchema } from "@/modules/identity/auth/schema/auth.schema";
import { selectPartner } from "@/modules/identity/auth/server/auth.service";
import { withApiHandler } from "@/lib/api-handler";

// 选择 partner：把 partial（登录后、选 partner 前）会话升级成完整会话，再跨 host 交接到目标 console。

/** @e2e-cell feature=auth kind=auth-boundary */
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
