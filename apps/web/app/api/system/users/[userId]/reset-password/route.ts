import { prisma } from "@cloud/db";
import { successResponse, badRequestResponse, notFoundResponse } from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_PROTECTED } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientUser, userPartnerInclude } from "@/app/(portal)/system/users/_server/user-mapper";
import { createPasswordResetToken } from "@/lib/password-reset-token";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.RESETPW"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID);

    const partnerId = session.currentPartnerId;
    const link = await prisma.sysPartnerUser.findUnique({
      where: { partnerId_userId: { partnerId, userId } },
    });
    if (!link || link.status !== "ACTIVE")
      return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    if (userId === session.userId || link.authorizingType === "ADMIN") {
      return badRequestResponse(ERR_USER_PROTECTED);
    }

    // 签发重置 token（存 Redis，72h TTL）；消费端后续补
    await createPasswordResetToken(userId);

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: userPartnerInclude(partnerId),
    });

    return successResponse(toClientUser(updated));
  },
);
