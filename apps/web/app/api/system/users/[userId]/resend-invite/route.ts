import { prisma } from "@cloud/db";
import { successResponse, badRequestResponse, notFoundResponse } from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NO_PENDING_INVITE } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientUser, USER_INCLUDE } from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.INVITE"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID);

    const partnerId = session.currentPartnerId;

    const invite = await prisma.sysInvite.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { creTime: "desc" },
    });
    if (!invite)
      return notFoundResponse(ERR_USER_NO_PENDING_INVITE, "No pending invite found for this user.");

    await prisma.sysInvite.update({
      where: { inviteId: invite.inviteId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        creUserId: session.userId,
        resendCount: { increment: 1 },
      },
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
