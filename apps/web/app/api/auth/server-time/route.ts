import { successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";
import { issueLoginNonce } from "@/lib/login-nonce";

// Backward-compat shim: password-change uses this to get a timestamp + nonce for
// RSA payload encryption. Prefer /api/auth/login-challenge for new call sites.

/** @e2e-cell feature=auth kind=route */
export const GET = withApiHandler(async () => {
  const nonce = await issueLoginNonce();
  return successResponse({ serverTimestamp: Date.now(), nonce });
});
