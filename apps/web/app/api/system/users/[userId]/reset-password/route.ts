import { randomBytes } from "node:crypto";
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_RESET_PW_PENDING } from "@cloud/request/error-codes";
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
    const link = await prisma.sysEntityUser.findUnique({
      where: { entityId_userId: { entityId, userId } },
    });
    if (!link || link.status !== "ACTIVE") return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId } });
    if (user.status === "PENDING") {
      return badRequestResponse(ERR_USER_RESET_PW_PENDING, "Cannot reset password for a pending user.");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 72 * 3_600_000);

    await prisma.$transaction(async (tx) => {
      await tx.sysPasswordResetRequest.updateMany({
        where: { userId, status: "PENDING" },
        data: { status: "SUPERSEDED" },
      });

      await tx.sysPasswordResetRequest.create({
        data: {
          userId,
          token,
          expiresAt,
          creUserId: session.id,
        },
      });
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
