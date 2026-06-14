/** @e2e-cell feature=notifications kind=route */
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_BAD_REQUEST } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { markRead, markAllRead } from "@/service/notification/mock-store";

/**
 * Mark notifications read — by id list (`{ ids }`) or all (`{ all: true }`).
 * Idempotent and one-way (UNREAD→READ); returns `{ updated }`. Authenticated only.
 *
 * Mock phase: mutates the shared store. Real version scopes the update by
 * userId + currentPartyId so a user can only touch their own. Swap replaces
 * only this body.
 */
export const POST = withApiHandler(async (req: Request) => {
  await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const body = (raw ?? {}) as { ids?: unknown; all?: unknown };
  if (body.all === true) {
    return successResponse({ updated: markAllRead() });
  }
  if (Array.isArray(body.ids) && body.ids.length > 0) {
    const ids = body.ids.filter((x): x is string => typeof x === "string");
    return successResponse({ updated: markRead(ids) });
  }
  throw new BusinessError(ERR_BAD_REQUEST);
});
