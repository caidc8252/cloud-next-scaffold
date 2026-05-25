import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_PROTECTED } from "@cloud/request/error-codes";
import { AuthzError, assertPermissions } from "@cloud/permissions/server";
import { toClientUser, USER_INCLUDE } from "../../../../../../lib/user-mapper";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await assertPermissions({ all: ["users.LOCK"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");

    if (userId === session.id) {
      return badRequestResponse(ERR_INVALID_ID, "Cannot disable your own account.");
    }

    const entityId = session.entity.entityId;
    const link = await prisma.sysEntityUser.findUnique({
      where: { entityId_userId: { entityId, userId } },
    });
    if (!link) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found in this entity.");

    if (link.authorizingType === "ADMIN") {
      return badRequestResponse(ERR_USER_PROTECTED, "Cannot disable an ADMIN user.");
    }

    // Toggle entity-user status
    const newStatus = link.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.sysEntityUser.update({
      where: { entityId_userId: { entityId, userId } },
      data: { status: newStatus, updUserId: session.id },
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true, status: true } },
        userRoles: { where: { entityId }, select: { roleId: true } },
      },
    });

    const nameMap = new Map([[session.id, session.username]]);
    return successResponse(toClientUser(updated, nameMap, nameMap));
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }

    return internalErrorResponse(error);
  }
}
