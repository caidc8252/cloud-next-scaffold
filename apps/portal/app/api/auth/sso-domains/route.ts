import { successResponse } from "@cloud/request/server";
import { getSsoDomains } from "@/lib/mock/store";
import { withApiHandler } from "@/lib/api-handler";

/**
 * Enterprise SSO domain registry. The sign-in form fetches this once and
 * resolves a typed email's domain locally, swapping the password field for the
 * partner's IdP button when the domain has an ACTIVE contract.
 *
 * @e2e-cell feature=auth kind=route
 */
export const GET = withApiHandler(async () => {
  return successResponse({ tenants: getSsoDomains() });
});
