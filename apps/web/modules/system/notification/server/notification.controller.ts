import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_BAD_REQUEST } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { listNoticesQuerySchema, markReadBodySchema } from "../schema/notification.schema";
import * as svc from "./notification.service";

// 各 /api/notifications/* 子路由共用本 controller:handler 具名导出。

/** 当前用户通知列表(作用域 + DB offset 分页 + 服务端筛选 status/module/q)。仅登录。 */
export const listNotices = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  const query = listNoticesQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const { items, pager } = await svc.listNotices(session, query);
  return successResponse({ items }, pager);
});

/** 标记已读(ids 或 all)。幂等、单向 UNREAD→READ、仅本人+作用域。仅登录。 */
export const markRead = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = markReadBodySchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_BAD_REQUEST);
  return successResponse({ updated: await svc.markRead(session, parsed.data) });
});

/** 当前用户未读数(铃铛角标)。仅登录。 */
export const unreadCount = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse({ count: await svc.unreadCount(session) });
});

/** 各 party 的未读数(party 切换器红点)。有意跨 party。仅登录。 */
export const unreadByParty = withApiHandler(async () => {
  const session = await assertPermissions({ all: [] });
  return successResponse({ counts: await svc.unreadCountByParty(session) });
});
