import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
} from "@cloud/request/server";
import { getSession } from "../../../../../../lib/auth";
import { toClientUser, USER_INCLUDE } from "../../../../../../lib/user-mapper";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const { userId: rawId } = await params;
  const userId = Number(rawId);
  if (!Number.isFinite(userId)) return badRequestResponse("Invalid user ID.");

  const entityId = session.entity.entityId;
  const link = await prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId } },
  });
  if (!link || link.status !== "ACTIVE") return notFoundResponse("User not found.");

  const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId } });

  if (user.status === "LOCKED") {
    // Unlock
    await prisma.sysUser.update({
      where: { userId },
      data: {
        status: "ACTIVE",
        passwordErrorTimes: 0,
        passwordErrorLockExpiredTimestamp: null,
        updUserId: session.id,
      },
    });
  } else if (user.status === "ACTIVE") {
    // Lock for 30 minutes
    await prisma.sysUser.update({
      where: { userId },
      data: {
        status: "LOCKED",
        passwordErrorLockExpiredTimestamp: new Date(Date.now() + 30 * 60_000),
        updUserId: session.id,
      },
    });
  } else {
    return badRequestResponse("Cannot lock/unlock a user with status " + user.status);
  }

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
}
