import "@/lib/forgot-error-messages";
import "@/lib/auth-error-messages"; // 密码解密/重放复用 ERR_AUTH_* 文案

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { resetSchema } from "@/service/forgot-password/schemas/forgot.schema";
import { resetPassword } from "@/service/forgot-password/server/forgot.service";
import { withApiHandler } from "@/lib/api-handler";

// 公共消费端（自助/管理员链接都落这里）：token + RSA 密文新密码 → 设密 + 消费 token。
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
