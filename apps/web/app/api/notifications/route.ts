/** @e2e-cell feature=notifications kind=route */
import { successResponse } from "@cloud/request/server";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";
import { listNoticesQuerySchema } from "@/service/notification/schemas/notification.schema";
import { listNotices } from "@/service/notification/server/notification.service";

/** 当前用户通知列表（作用域 + DB offset 分页 + 服务端筛选 status/module/q）。仅登录。 */
export const GET = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: [] });
  const query = listNoticesQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const { items, pager } = await listNotices(session, query);
  return successResponse({ items }, pager);
});
