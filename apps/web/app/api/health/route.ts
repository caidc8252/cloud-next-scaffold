import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async () => {
  return successResponse({
    ok: true,
    service: "web",
  });
});
