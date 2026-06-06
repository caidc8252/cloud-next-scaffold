import { z } from "zod";
import { prisma } from "@cloud/db";
import { getPartialSession, updateSession } from "@cloud/permissions/server";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  errorResponse,
} from "@cloud/request/server";
import {
  ERR_AUTH_INVALID_PARTNER,
  ERR_AUTH_PARTNER_REQUIRED,
  ERR_AUTH_NOT_AUTHENTICATED,
} from "@/lib/auth-error-codes";
import "@/lib/auth-error-messages";
import { withApiHandler } from "@/lib/api-handler";

const selectPartnerSchema = z.object({
  partnerId: z.number().int().positive(),
});

/** @e2e-cell feature=auth kind=auth-boundary */
export const POST = withApiHandler(async (req: Request) => {
  const partial = await getPartialSession();
  if (!partial) {
    return unauthorizedResponse(ERR_AUTH_NOT_AUTHENTICATED);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequestResponse(ERR_AUTH_PARTNER_REQUIRED);
  }

  const parsed = selectPartnerSchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse(ERR_AUTH_PARTNER_REQUIRED);
  }

  const { partnerId } = parsed.data;

  const partnerUser = await prisma.sysPartnerUser.findUnique({
    where: { partnerId_userId: { partnerId, userId: partial.userId } },
    include: { partner: true },
  });

  if (!partnerUser || partnerUser.status !== "ACTIVE" || partnerUser.partner.status !== "ACTIVE") {
    return errorResponse(ERR_AUTH_INVALID_PARTNER);
  }

  const snapshot = await buildSessionSnapshot(partial.userId, partnerId);
  if (!snapshot || snapshot.currentPartnerId === null) {
    return errorResponse(ERR_AUTH_INVALID_PARTNER);
  }

  await updateSession(snapshot);
  return successResponse({ redirectTo: "/" });
});
