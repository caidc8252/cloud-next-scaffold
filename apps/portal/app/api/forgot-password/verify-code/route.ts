import { successResponse } from "@cloud/request/server";
import { verifyCodeSchema } from "@/lib/schemas";
import { readJson, withApiHandler } from "@/lib/api-handler";

/**
 * Account recovery, step 2: verify the emailed code. Demo accepts any 6 digits.
 *
 * @e2e-cell feature=auth kind=route
 */
export const POST = withApiHandler(async (req: Request) => {
  await readJson(req, verifyCodeSchema);
  return successResponse({ ok: true });
});
