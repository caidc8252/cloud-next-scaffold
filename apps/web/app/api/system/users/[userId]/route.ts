import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_INVALID_JSON, ERR_USER_NOT_FOUND, ERR_USER_PROTECTED } from "@cloud/request/error-codes";
import { AuthzError, assertPermissions, hasPermissions } from "@cloud/permissions/server";
import { toClientUser, USER_INCLUDE } from "../../../../../lib/user-mapper";

async function findUserInEntity(userId: number, entityId: number) {
  return prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId } },
  });
}

function normalizeRoleIds(roleIds: number[]) {
  return [...new Set(roleIds)].sort((left, right) => left - right);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await assertPermissions({ all: ["users.UPD"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");

    const entityId = session.entity.entityId;
    const link = await findUserInEntity(userId, entityId);
    if (!link) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    const isProtected = userId === session.id || link.authorizingType === "ADMIN";

    let body: { displayName?: string; remark?: string; roleIds?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON, "Invalid JSON body.");
    }

    // Protected users can only have remark updated
    if (isProtected && (body.displayName !== undefined || body.roleIds !== undefined)) {
      return badRequestResponse(ERR_USER_PROTECTED, "This user can only have remark updated.");
    }

    const requestedRoleIds = body.roleIds === undefined
      ? null
      : normalizeRoleIds(body.roleIds.map(Number).filter(Number.isFinite));

    if (requestedRoleIds !== null) {
      const currentRoleLinks = await prisma.sysUserRole.findMany({
        where: { userId, entityId },
        select: { roleId: true },
      });
      const currentRoleIds = normalizeRoleIds(currentRoleLinks.map((roleLink) => roleLink.roleId));
      const roleIdsChanged = requestedRoleIds.length !== currentRoleIds.length
        || requestedRoleIds.some((roleId, index) => roleId !== currentRoleIds[index]);

      if (
        roleIdsChanged &&
        !hasPermissions(session.permissions, { all: ["users.CHANGE_ROLE"] })
      ) {
        return forbiddenResponse("forbidden", "Forbidden.");
      }
    }

    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { updUserId: session.id };
      if (body.displayName !== undefined) data.displayName = body.displayName.trim() || null;
      if (body.remark !== undefined) data.remark = body.remark.trim() || null;
      await tx.sysUser.update({ where: { userId }, data });

      if (body.roleIds !== undefined) {
        const nextRoleIds = requestedRoleIds ?? [];
        await tx.sysUserRole.deleteMany({ where: { userId, entityId } });
        if (nextRoleIds.length > 0) {
          await tx.sysUserRole.createMany({
            data: nextRoleIds.map((roleId) => ({
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
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }

    return internalErrorResponse(error);
  }
}
