/** @e2e-cell feature=notifications kind=route */
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_BAD_REQUEST } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { markReadBodySchema } from "@/service/notification/schemas/notification.schema";
import { markRead } from "@/service/notification/server/notification.service";

/** 标记已读（ids 或 all）。幂等、单向 UNREAD→READ、仅本人+作用域。仅登录。 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new BusinessError(ERR_INVALID_JSON); }
  const parsed = markReadBodySchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_BAD_REQUEST);
  return successResponse({ updated: await markRead(session, parsed.data) });
});
