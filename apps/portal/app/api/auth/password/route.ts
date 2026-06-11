import "@/lib/auth-error-messages";

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_AUTH_CREDENTIALS_REQUIRED } from "@/lib/auth-error-codes";
import { loginSchema } from "@/service/auth/schemas/auth.schema";
import { login } from "@/service/auth/server/auth.service";
import { withApiHandler } from "@/lib/api-handler";

// 登录第一段：账号 + RSA 密文密码。route 只解析 + 调 service，业务编排在 auth.service。
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_AUTH_CREDENTIALS_REQUIRED);

  return successResponse(await login(parsed.data));
});
