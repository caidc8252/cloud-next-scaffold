import { z } from "zod";
import { getPartialSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_AUTH_PARTNER_REQUIRED } from "@/lib/auth-error-codes";
import "@/lib/auth-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { selectPartnerForPlatform } from "@/lib/partner-selection-service";

const selectPartnerSchema = z.object({
  partnerId: z.number().int().positive(),
});

export const POST = withApiHandler(async (req: Request) => {
  const partial = await getPartialSession();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_AUTH_PARTNER_REQUIRED);
  }

  const parsed = selectPartnerSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessError(ERR_AUTH_PARTNER_REQUIRED);
  }

  return successResponse(await selectPartnerForPlatform(partial, parsed.data));
});
