import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  notFoundResponse,
  noContentResponse,
} from "@cloud/request/server";
import {
  ERR_INVALID_ID,
  ERR_INVALID_JSON,
  ERR_ROLE_NOT_FOUND,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_DELETE_ASSIGNED,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { withApiHandler } from "@/lib/api-handler";

export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["roles.UPD"] });
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) return badRequestResponse(ERR_INVALID_ID);

    const existing = await prisma.sysRole.findUnique({ where: { roleId } });
    if (
      !existing ||
      (existing.partnerId !== null && existing.partnerId !== session.currentPartnerId)
    ) {
      return notFoundResponse(ERR_ROLE_NOT_FOUND, "Role not found.");
    }

    let body: { name?: string; description?: string; permissions?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON);
    }

    const isBuiltin = existing.roleType === "BUILTIN";

    const dataUpdate: Record<string, unknown> = { updUserId: session.userId };
    if (!isBuiltin) {
      if (body.name !== undefined) dataUpdate.roleName = body.name.trim();
      if (body.description !== undefined) dataUpdate.remark = body.description.trim() || null;
    }
    if (body.permissions !== undefined) {
      dataUpdate.permissionCodes = body.permissions;
    }

    const updated = await prisma.sysRole.update({ where: { roleId }, data: dataUpdate });

    const operatorCount = await prisma.sysPartnerUser.count({
      where: {
        partnerId: session.currentPartnerId,
        status: { in: ["ACTIVE", "LOCKED"] },
        roles: { array_contains: [{ roleId }] },
      },
    });

    return successResponse(toClientRole(updated, session.username, operatorCount));
  },
);

export const DELETE = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["roles.DELETE"] });
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) return badRequestResponse(ERR_INVALID_ID);

    const existing = await prisma.sysRole.findUnique({ where: { roleId } });
    if (
      !existing ||
      (existing.partnerId !== null && existing.partnerId !== session.currentPartnerId)
    ) {
      return notFoundResponse(ERR_ROLE_NOT_FOUND, "Role not found.");
    }

    if (existing.roleType === "BUILTIN") {
      return badRequestResponse(ERR_ROLE_DELETE_BUILTIN);
    }

    // 角色绑定走 sys_partner_user.roles JSONB；用 array_contains 判断是否仍被绑定。
    const assignedCount = await prisma.sysPartnerUser.count({
      where: { roles: { array_contains: [{ roleId }] } },
    });
    if (assignedCount > 0) {
      return badRequestResponse(ERR_ROLE_DELETE_ASSIGNED);
    }

    await prisma.sysRole.delete({ where: { roleId } });

    return noContentResponse();
  },
);
