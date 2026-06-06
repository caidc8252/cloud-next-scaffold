import { z } from "zod";
import { prisma } from "@cloud/db";
import { getPartialSession, updateSession } from "@cloud/permissions/server";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
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
    throw new BusinessError(ERR_AUTH_NOT_AUTHENTICATED, 401);
  }

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

  const { partnerId } = parsed.data;

  const partnerUser = await prisma.sysPartnerUser.findUnique({
    where: { partnerId_userId: { partnerId, userId: partial.userId } },
    include: { partner: true },
  });

  if (!partnerUser || partnerUser.status !== "ACTIVE" || partnerUser.partner.status !== "ACTIVE") {
    throw new BusinessError(ERR_AUTH_INVALID_PARTNER);
  }

  const snapshot = await buildSessionSnapshot(partial.userId, partnerId);
  if (!snapshot || snapshot.currentPartnerId === null) {
    throw new BusinessError(ERR_AUTH_INVALID_PARTNER);
  }

  await updateSession(snapshot);
  return successResponse({ redirectTo: "/" });
});
