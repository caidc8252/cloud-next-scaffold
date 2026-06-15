/** @e2e-cell feature=notifications kind=route */
import { successResponse } from "@cloud/request/server";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { unreadCount } from "@/service/notification/server/notification.service";

/** 当前用户未读数（铃铛角标）。仅登录。 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse({ count: await unreadCount(session) });
});
