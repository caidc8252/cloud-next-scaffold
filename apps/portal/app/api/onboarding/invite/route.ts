import "@/lib/onboarding-error-messages";

import { successResponse } from "@cloud/request/server";
import { getInvite } from "@/service/onboarding/server/onboarding.service";
import { withApiHandler } from "@/lib/api-handler";

// 验票：按 token 解析邀请（PENDING + 未过期）。公开，无需会话。route 只解析 + 调 service。
export const GET = withApiHandler(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return successResponse({ invitation: await getInvite(token) });
});
