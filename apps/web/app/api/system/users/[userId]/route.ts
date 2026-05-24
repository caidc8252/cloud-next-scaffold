import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_INVALID_JSON, ERR_USER_NOT_FOUND } from "@cloud/request/error-codes";
import { getSession } from "../../../../../lib/auth";
import { toClientUser, USER_INCLUDE } from "../../../../../lib/user-mapper";

async function findUserInEntity(userId: number, entityId: number) {
  const link = await prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId } },
  });
  return link?.status === "ACTIVE" ? link : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");

    const entityId = session.entity.entityId;
    if (!await findUserInEntity(userId, entityId)) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    let body: { displayName?: string; remark?: string; roleIds?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON, "Invalid JSON body.");
    }

    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { updUserId: session.id };
      if (body.displayName !== undefined) data.displayName = body.displayName.trim() || null;
      if (body.remark !== undefined) data.remark = body.remark.trim() || null;
      await tx.sysUser.update({ where: { userId }, data });

      if (body.roleIds !== undefined) {
        await tx.sysUserRole.deleteMany({ where: { userId, entityId } });
        const roleIds = body.roleIds.map(Number).filter(Number.isFinite);
        if (roleIds.length > 0) {
          await tx.sysUserRole.createMany({
            data: roleIds.map((roleId) => ({
              entityId,
              userId,
              roleId,
              creUserId: session.id,
            })),
          });
        }
      }
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
    return internalErrorResponse(error);
  }
}
