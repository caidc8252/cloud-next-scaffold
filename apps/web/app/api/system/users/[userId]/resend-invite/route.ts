import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NO_PENDING_INVITE } from "@cloud/request/error-codes";
import { getSession } from "../../../../../../lib/auth";
import { toClientUser, USER_INCLUDE } from "../../../../../../lib/user-mapper";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");

    const entityId = session.entity.entityId;

    const invite = await prisma.sysInvite.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { creTime: "desc" },
    });
    if (!invite) return notFoundResponse(ERR_USER_NO_PENDING_INVITE, "No pending invite found for this user.");

    await prisma.sysInvite.update({
      where: { inviteId: invite.inviteId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        creUserId: session.id,
        resendCount: { increment: 1 },
      },
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true } },
        userRoles: { where: { entityId }, select: { roleId: true } },
      },
    });

    const nameMap = new Map([[session.id, session.username]]);
    return successResponse(toClientUser(updated, nameMap, nameMap));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
