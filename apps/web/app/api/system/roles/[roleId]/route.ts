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
      (existing.entityId !== null && existing.entityId !== session.entity.entityId)
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

    const dataUpdate: Record<string, unknown> = { updUserId: session.id };
    if (!isBuiltin) {
      if (body.name !== undefined) dataUpdate.roleName = body.name.trim();
      if (body.description !== undefined) dataUpdate.remark = body.description.trim() || null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.sysRole.update({ where: { roleId }, data: dataUpdate });

      if (body.permissions !== undefined) {
        await tx.sysRolePermission.deleteMany({ where: { roleId } });
        if (body.permissions.length > 0) {
          await tx.sysRolePermission.createMany({
            data: body.permissions.map((code) => ({
              roleId,
              permissionCode: code,
              creUserId: session.id,
            })),
          });
        }
      }
    });

    const updated = await prisma.sysRole.findUniqueOrThrow({
      where: { roleId },
      include: {
        permissions: { select: { permissionCode: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return successResponse(toClientRole(updated, session.username));
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
      (existing.entityId !== null && existing.entityId !== session.entity.entityId)
    ) {
      return notFoundResponse(ERR_ROLE_NOT_FOUND, "Role not found.");
    }

    if (existing.roleType === "BUILTIN") {
      return badRequestResponse(ERR_ROLE_DELETE_BUILTIN);
    }

    const assignedCount = await prisma.sysUserRole.count({ where: { roleId } });
    if (assignedCount > 0) {
      return badRequestResponse(ERR_ROLE_DELETE_ASSIGNED);
    }

    await prisma.sysRole.delete({ where: { roleId } });

    return noContentResponse();
  },
);
