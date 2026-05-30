import { prisma } from "@cloud/db";
import { successResponse, badRequestResponse, notFoundResponse } from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_PROTECTED } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientUser, USER_INCLUDE } from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
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
  },
);
