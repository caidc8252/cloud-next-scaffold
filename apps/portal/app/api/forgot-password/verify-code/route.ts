import "@/lib/forgot-error-messages";

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { verifyCodeSchema } from "@/service/forgot-password/schemas/forgot.schema";
import { verifyRecoveryCode } from "@/service/forgot-password/server/forgot.service";
import { withApiHandler } from "@/lib/api-handler";

// 找回第 2 步：校验验证码（UX 预检，不消费）。
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = verifyCodeSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);
  return successResponse(await verifyRecoveryCode(parsed.data));
});
