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
  ERR_AUTH_INVALID_ENTITY,
  ERR_AUTH_ENTITY_REQUIRED,
  ERR_AUTH_NOT_AUTHENTICATED,
} from "@/lib/auth-error-codes";
import "@/lib/auth-error-messages";
import { withApiHandler } from "@/lib/api-handler";

const selectEntitySchema = z.object({
  entityId: z.number().int().positive(),
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
    return badRequestResponse(ERR_AUTH_ENTITY_REQUIRED);
  }

  const parsed = selectEntitySchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse(ERR_AUTH_ENTITY_REQUIRED);
  }

  const { entityId } = parsed.data;

  const entityUser = await prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId: partial.id } },
    include: { entity: true },
  });

  if (!entityUser || entityUser.status !== "ACTIVE" || entityUser.entity.status !== "ACTIVE") {
    return errorResponse(ERR_AUTH_INVALID_ENTITY);
  }

  const snapshot = await buildSessionSnapshot(partial.id, entityId);
  if (!snapshot || !snapshot.currentEntity) {
    return errorResponse(ERR_AUTH_INVALID_ENTITY);
  }

  await updateSession(snapshot);
  return successResponse({ redirectTo: "/" });
});
