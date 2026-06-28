import { successResponse } from "@cloud/request/server";
import { validateResetToken } from "@/modules/identity/forgot-password/server/forgot.service";
import { withApiHandler } from "@/lib/api-handler";

// 重置页加载时校验 token，决定显示设密表单或"链接已失效"。公开，非破坏性。
export const GET = withApiHandler(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return successResponse(await validateResetToken(token));
});
