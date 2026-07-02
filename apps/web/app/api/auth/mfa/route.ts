import "@/modules/identity/auth/error/auth.error-messages";

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_AUTH_MFA_CODE_INVALID } from "@/modules/identity/auth/error/auth.error-codes";
import { mfaVerifySchema } from "@/modules/identity/auth/schema/auth.schema";
import { verifyMfa } from "@/modules/identity/auth/server/auth.service";
import { withApiHandler } from "@/lib/api-handler";

// 登录第二段：一次性 mfaToken + TOTP 码。route 只解析 + 调 service。
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_AUTH_MFA_CODE_INVALID, 401);
  }

  const parsed = mfaVerifySchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_AUTH_MFA_CODE_INVALID, 401);

  return successResponse(await verifyMfa(parsed.data));
});
