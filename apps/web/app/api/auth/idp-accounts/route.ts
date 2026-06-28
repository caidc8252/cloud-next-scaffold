import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";

// IdP 账号列表：第三方 IdP（Google/Apple/Microsoft）consent 步骤返回的可选账号。
// TODO: 替换为真实 OIDC 流程（OIDC/SSO 功能尚待产品确认去留）。

/** @e2e-cell feature=auth kind=route */
export const GET = withApiHandler(async () => {
  return successResponse({ accounts: [] });
});
