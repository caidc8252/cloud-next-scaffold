import { prisma } from "@cloud/db";
import { successResponse, badRequestResponse, notFoundResponse } from "@cloud/request/server";
import {
  ERR_INVALID_ID,
  ERR_USER_NOT_FOUND,
  ERR_USER_PROTECTED,
  ERR_USER_CANNOT_DISABLE_SELF,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientUser, USER_INCLUDE } from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.LOCK"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID);

    if (userId === session.userId) {
      return badRequestResponse(ERR_USER_CANNOT_DISABLE_SELF);
    }

    const partnerId = session.currentPartnerId;
    const link = await prisma.sysPartnerUser.findUnique({
      where: { partnerId_userId: { partnerId, userId } },
    });
    if (!link) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found in this partner.");

    if (link.authorizingType === "ADMIN") {
      return badRequestResponse(ERR_USER_PROTECTED);
    }

    // Toggle partner-user status
    const newStatus = link.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.sysPartnerUser.update({
      where: { partnerId_userId: { partnerId, userId } },
      data: { status: newStatus, updUserId: session.userId },
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        partnerUsers: { where: { partnerId }, select: { authorizingType: true, status: true } },
        userRoles: { where: { partnerId }, select: { roleId: true } },
      },
    });

    const nameMap = new Map([[session.userId, session.username]]);
    return successResponse(toClientUser(updated, nameMap, nameMap));
  },
);
