import "@/lib/forgot-error-messages";
import "@/lib/auth-error-messages"; // 密码解密/重放复用 ERR_AUTH_* 文案

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { resetSchema } from "@/service/forgot-password/schemas/forgot.schema";
import { resetPassword } from "@/service/forgot-password/server/forgot.service";
import { withApiHandler } from "@/lib/api-handler";

// 找回第 3 步：设新密码（RSA 密文 + 验证码 + 策略 + 历史去重）。
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);
  return successResponse(await resetPassword(parsed.data));
});
