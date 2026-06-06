import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import {
  ERR_INVALID_ID,
  ERR_USER_NOT_FOUND,
  ERR_USER_PROTECTED,
  ERR_USER_CANNOT_DISABLE_SELF,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientUser, userPartnerInclude } from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.LOCK"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) throw new BusinessError(ERR_INVALID_ID);

    if (userId === session.userId) {
      throw new BusinessError(ERR_USER_CANNOT_DISABLE_SELF);
    }

    const partnerId = session.currentPartnerId;
    const link = await prisma.sysPartnerUser.findUnique({
      where: { partnerId_userId: { partnerId, userId } },
    });
    if (!link) throw new BusinessError(ERR_USER_NOT_FOUND, 404);

    if (link.authorizingType === "ADMIN") {
      throw new BusinessError(ERR_USER_PROTECTED);
    }

    // Toggle partner-user status（账号锁定走 partner-user 维度：ACTIVE ↔ LOCKED）
    const newStatus = link.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    await prisma.sysPartnerUser.update({
      where: { partnerId_userId: { partnerId, userId } },
      data: { status: newStatus, updUserId: session.userId },
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: userPartnerInclude(partnerId),
    });

    return successResponse(toClientUser(updated));
  },
);
