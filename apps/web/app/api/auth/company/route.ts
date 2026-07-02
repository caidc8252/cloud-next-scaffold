import { withApiHandler } from "@/lib/api-handler";
import { BusinessError } from "@cloud/request";
import { ERR_AUTH_INVALID_CREDENTIALS } from "@/modules/identity/auth/error/auth.error-codes";

// OIDC 公司选择（多 workspace 时的二段 sign-in）。TODO: 替换为真实实现（功能尚待产品确认去留）。

/** @e2e-cell feature=auth kind=auth-boundary */
export const POST = withApiHandler(async () => {
  throw new BusinessError(ERR_AUTH_INVALID_CREDENTIALS);
});
