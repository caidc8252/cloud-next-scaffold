/** @e2e-cell feature=notifications kind=route */
import { successResponse } from "@cloud/request/server";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { unreadCount } from "@/service/notification/mock-store";

/**
 * Current user's unread count — the cheap endpoint the bell badge polls on
 * focus/visibility change. Authenticated only.
 *
 * Mock phase: counts the shared store. Real version: COUNT(SysNotice WHERE
 * status=UNREAD AND scope). Swap replaces only this body.
 */
export const GET = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse({ count: unreadCount() });
});
