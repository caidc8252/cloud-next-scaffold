/** @e2e-cell feature=notifications kind=route */
import { successResponse } from "@cloud/request/server";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { unreadCountByParty } from "@/service/notification/server/notification.service";

/**
 * 各 party 的未读数（party 切换器红点）。有意跨 party：仅按 userId 收窄、按 party 分组，
 * 不套当前 party 作用域；全局(null)不计入。仅登录。
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse({ counts: await unreadCountByParty(session) });
});
