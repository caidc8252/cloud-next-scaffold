import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";

// SSO 域注册表：登录表单按邮件域查是否有 SSO 合同（有则换显 IdP 按钮）。
// TODO: 替换为真实 SSO 域数据源（OIDC/SSO 功能尚待产品确认去留）。

/** @e2e-cell feature=auth kind=route */
export const GET = withApiHandler(async () => {
  return successResponse({ tenants: [] });
});
