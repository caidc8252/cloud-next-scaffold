import "@/lib/forgot-error-messages";

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { sendCodeSchema } from "@/service/forgot-password/schemas/forgot.schema";
import { sendRecoveryCode } from "@/service/forgot-password/server/forgot.service";
import { withApiHandler } from "@/lib/api-handler";

// 找回第 1 步：给账号邮箱发验证码。防枚举：无论邮箱是否存在都返回 ok。
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = sendCodeSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);
  return successResponse(await sendRecoveryCode(parsed.data));
});
