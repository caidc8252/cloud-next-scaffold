import { randomBytes } from "node:crypto";
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
  if (user.status === "PENDING") {
    return badRequestResponse("Cannot reset password for a pending user.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 3_600_000); // 72 hours

  await prisma.$transaction(async (tx) => {
    // Supersede any existing PENDING requests
    await tx.sysPasswordResetRequest.updateMany({
      where: { userId, status: "PENDING" },
      data: { status: "SUPERSEDED" },
    });

    // Create new request
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
}
