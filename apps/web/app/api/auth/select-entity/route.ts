import { z } from "zod";
import { prisma } from "@cloud/db";
import { getPartialSession, upgradeSession } from "@cloud/permissions/server";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  errorResponse,
} from "@cloud/request/server";
import {
  ERR_AUTH_INVALID_ENTITY,
  ERR_AUTH_MISSING_FIELDS,
  ERR_AUTH_NOT_AUTHENTICATED,
} from "@/lib/auth-error-codes";
import { withApiHandler } from "@/lib/api-handler";

const selectEntitySchema = z.object({
  entityId: z.number().int().positive(),
});

/** @e2e-cell feature=auth kind=auth-boundary */
export const POST = withApiHandler(async (req: Request) => {
  const partial = await getPartialSession();
  if (!partial) {
    return unauthorizedResponse(ERR_AUTH_NOT_AUTHENTICATED, "Not authenticated.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequestResponse(ERR_AUTH_MISSING_FIELDS, "Select an organization.");
  }

  const parsed = selectEntitySchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse(ERR_AUTH_MISSING_FIELDS, "Select an organization.");
  }

  const { entityId } = parsed.data;

  const entityUser = await prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId: partial.id } },
    include: { entity: true },
  });

  if (!entityUser || entityUser.status !== "ACTIVE" || entityUser.entity.status !== "ACTIVE") {
    return errorResponse(ERR_AUTH_INVALID_ENTITY, "This organization is not available.", 400);
  }

  const contract = await prisma.sysEntityContract.findFirst({
    where: { authorizedEntityId: entityId, status: "ACTIVE" },
  });

  if (!contract) {
    return errorResponse(ERR_AUTH_INVALID_ENTITY, "This organization is not available.", 400);
  }

  await upgradeSession(entityId);
  return successResponse({ redirectTo: "/" });
});
