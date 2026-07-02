import "@/modules/identity/forgot-password/error/forgot.error-messages";

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { sendLinkSchema } from "@/modules/identity/forgot-password/schema/forgot.schema";
import { sendResetLink } from "@/modules/identity/forgot-password/server/forgot.service";
import { withApiHandler } from "@/lib/api-handler";

// 自助找回触发：给账号邮箱发重置链接。防枚举：无论邮箱是否存在都返回 ok。
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = sendLinkSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);
  return successResponse(await sendResetLink(parsed.data));
});
