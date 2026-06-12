import "@/lib/onboarding-error-messages";

import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { getPartialSession } from "@cloud/permissions/server";
import { acceptInputSchema } from "@/service/onboarding/schemas/onboarding.schema";
import { accept } from "@/service/onboarding/server/onboarding.service";
import { withApiHandler } from "@/lib/api-handler";

// 接受邀请：绑定 + 消费 + 激活 + 建会话。mode=existing 用当前 portal 会话用户。
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = acceptInputSchema.safeParse(body);
  if (!parsed.success) throw new BusinessError(ERR_INVALID_JSON);

  const session = await getPartialSession();
  return successResponse(await accept(parsed.data, session?.userId ?? null));
});
