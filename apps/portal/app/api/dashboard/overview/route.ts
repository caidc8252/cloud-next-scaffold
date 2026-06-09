import { successResponse, unauthorizedResponse } from "@cloud/request/server";
import { getDashboardKpis } from "@/lib/mock/store";
import { getSession } from "@/lib/mock/session";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Console overview metrics (active terminals, fleet uptime, pending updates,
 * open alerts). Session-gated; labels are localized client-side, values come
 * from here.
 *
 * @e2e-cell feature=dashboard kind=route
 */
export const GET = withApiHandler(async () => {
  const session = await getSession();
  if (!session) return unauthorizedResponse();
  return successResponse({ kpis: getDashboardKpis() });
});
