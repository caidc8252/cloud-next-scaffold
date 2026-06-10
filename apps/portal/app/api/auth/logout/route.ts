import { destroySession } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async () => {
  await destroySession();
  return successResponse({ redirectTo: "/login" });
});
