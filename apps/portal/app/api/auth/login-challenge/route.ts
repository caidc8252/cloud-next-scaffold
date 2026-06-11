import { successResponse } from "@cloud/request/server";
import { issueLoginNonce } from "@/lib/login-nonce";
import { withApiHandler } from "@/lib/api-handler";

// 登录 challenge：服务端时间戳 + 一次性 nonce（防重放）。前端把两者放进加密登录包。
// 按 IP 限流应在边缘/中间件做（防 nonce 刷量）。
export const GET = withApiHandler(async () => {
  return successResponse({ serverTimestamp: Date.now(), nonce: await issueLoginNonce() });
});
