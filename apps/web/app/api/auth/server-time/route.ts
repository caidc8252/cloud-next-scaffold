import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";

/** 公开端点：返回服务端当前时间戳（epoch ms），供前端登录前打包加密用。无副作用、无鉴权。 */
export const GET = withApiHandler(async () => {
  return successResponse({ serverTimestamp: Date.now() });
});
