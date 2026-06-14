/** @e2e-cell feature=notifications kind=route */
import { successResponse } from "@cloud/request/server";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { list } from "@/service/notification/mock-store";

/**
 * Current user's notification list (newest-first), for the bell popover and the
 * full list page. Authenticated only — no specific permission code.
 *
 * Mock phase: reads the shared in-memory store. The real version will scope by
 * userId + currentPartyId and read SysNotice; the swap replaces only this body.
 */
export const GET = withApiHandler(async (req: Request) => {
  await assertPermissions({ all: [] });
  const limitRaw = new URL(req.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
  return successResponse({ items: list(limit) });
});
