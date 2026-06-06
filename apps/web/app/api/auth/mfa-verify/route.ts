import { z } from "zod";
import { prisma } from "@cloud/db";
import { createSession } from "@cloud/permissions/server";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { successResponse, badRequestResponse, errorResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import {
  ERR_AUTH_MFA_TOKEN_INVALID,
  ERR_AUTH_MFA_CODE_INVALID,
  ERR_AUTH_MFA_LOCKED,
  ERR_AUTH_MFA_NOT_CONFIGURED,
} from "@/lib/auth-error-codes";
import "@/lib/auth-error-messages";
import { withApiHandler } from "@/lib/api-handler";
import { readMfaLoginToken, deleteMfaLoginToken } from "@/lib/login-token";
import { verifyActiveTotp } from "@/app/(portal)/account/_server/mfa-service";

/**
 * Login second stage — verify the MFA code and complete sign-in.
 *
 * Gated by the one-time mfaToken from the password stage (not session-auth).
 * Looks up the token → userId, re-checks the user, verifies the code against ALL
 * ACTIVE factors (any match passes — tolerant of an in-flight reconfigure),
 * consumes the token, and builds the real session. Wrong codes don't burn the
 * token; brute force is bounded by the SysMfaInfo failTimes lockout (10).
 *
 * @e2e-cell feature=auth kind=auth-boundary
 */
const schema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().trim().length(6),
});

export const POST = withApiHandler(async (req: Request) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequestResponse(ERR_INVALID_JSON);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return errorResponse(ERR_AUTH_MFA_CODE_INVALID, undefined, 401);

  const userId = await readMfaLoginToken(parsed.data.mfaToken);
  if (userId === null) return errorResponse(ERR_AUTH_MFA_TOKEN_INVALID, undefined, 401);

  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE" || !user.mfaEnable) {
    return errorResponse(ERR_AUTH_MFA_TOKEN_INVALID, undefined, 401);
  }

  const result = await verifyActiveTotp(userId, parsed.data.code);
  if (result === "none") return errorResponse(ERR_AUTH_MFA_NOT_CONFIGURED, undefined, 409);
  if (result === "locked") return errorResponse(ERR_AUTH_MFA_LOCKED, undefined, 423);
  if (result === "invalid") return errorResponse(ERR_AUTH_MFA_CODE_INVALID, undefined, 401);

  // success → consume the one-time token, then build the real session
  await deleteMfaLoginToken(parsed.data.mfaToken);

  const partnerUsers = await prisma.sysPartnerUser.findMany({
    where: { userId },
    include: { partner: true },
  });
  const activePartnerUsers = partnerUsers.filter(
    (pu) => pu.status === "ACTIVE" && pu.partner.status === "ACTIVE",
  );
  const currentPartnerId = activePartnerUsers.length === 1 ? activePartnerUsers[0].partnerId : null;
  const snapshot = await buildSessionSnapshot(userId, currentPartnerId);
  if (!snapshot) return errorResponse(ERR_AUTH_MFA_TOKEN_INVALID, undefined, 401);
  await createSession(snapshot);

  if (activePartnerUsers.length === 1) return successResponse({ redirectTo: "/" });
  if (activePartnerUsers.length > 1) return successResponse({ redirectTo: "/select-partner" });
  return successResponse({ redirectTo: "/locked" });
});
