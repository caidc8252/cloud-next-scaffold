import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@cloud/request/server";
import {
  ERR_INVALID_ID,
  ERR_INVALID_JSON,
  ERR_USER_NOT_FOUND,
  ERR_USER_PROTECTED,
} from "@cloud/request/error-codes";
import { assertPermissions, hasPermissions } from "@cloud/permissions/server";
import {
  toClientUser,
  extractRoleIds,
  userPartnerInclude,
} from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

async function findUserInPartner(userId: number, partnerId: number) {
  return prisma.sysPartnerUser.findUnique({
    where: { partnerId_userId: { partnerId, userId } },
  });
}

function normalizeRoleIds(roleIds: number[]) {
  return [...new Set(roleIds)].sort((left, right) => left - right);
}

export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.UPD"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID);

    const partnerId = session.currentPartnerId;
    const link = await findUserInPartner(userId, partnerId);
    if (!link) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    const isProtected = userId === session.userId || link.authorizingType === "ADMIN";

    let body: { displayName?: string; remark?: string; roleIds?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON);
    }

    // Protected users can only have remark updated
    if (isProtected && (body.displayName !== undefined || body.roleIds !== undefined)) {
      return badRequestResponse(ERR_USER_PROTECTED);
    }

    const requestedRoleIds =
      body.roleIds === undefined
        ? null
        : normalizeRoleIds(body.roleIds.map(Number).filter(Number.isFinite));

    if (requestedRoleIds !== null) {
      const currentRoleIds = normalizeRoleIds(extractRoleIds(link.roles).map(Number));
      const roleIdsChanged =
        requestedRoleIds.length !== currentRoleIds.length ||
        requestedRoleIds.some((roleId, index) => roleId !== currentRoleIds[index]);

      if (roleIdsChanged && !hasPermissions(session.permissions, { all: ["users.CHANGE_ROLE"] })) {
        return forbiddenResponse("forbidden", "Forbidden.");
      }
    }

    await prisma.$transaction(async (tx) => {
      if (body.displayName !== undefined || body.remark !== undefined) {
        const userData: Record<string, unknown> = { updUserId: session.userId };
        if (body.displayName !== undefined) userData.nickName = body.displayName.trim();
        if (body.remark !== undefined) userData.remark = body.remark.trim() || null;
        await tx.sysUser.update({ where: { userId }, data: userData });
      }

      if (requestedRoleIds !== null) {
        await tx.sysPartnerUser.update({
          where: { partnerId_userId: { partnerId, userId } },
          data: {
            roles: requestedRoleIds.map((roleId) => ({ roleId })),
            updUserId: session.userId,
          },
        });
      }
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: userPartnerInclude(partnerId),
    });

    return successResponse(toClientUser(updated));
  },
);
