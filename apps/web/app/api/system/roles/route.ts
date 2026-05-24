import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  createdResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_ROLE_NAME_SHORT } from "@cloud/request/error-codes";
import { getSession } from "../../../../lib/auth";
import { toClientRole } from "../../../../lib/role-mapper";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const roles = await prisma.sysRole.findMany({
      where: { OR: [{ entityId: session.entity.entityId }, { entityId: null }] },
      include: {
        permissions: { select: { permissionCode: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { creTime: "asc" },
    });

    const updaterIds = [...new Set(roles.map((r) => r.updUserId))];
    const updaters = updaterIds.length > 0
      ? await prisma.sysUser.findMany({
          where: { userId: { in: updaterIds } },
          select: { userId: true, username: true },
        })
      : [];
    const updaterMap = new Map(updaters.map((u) => [u.userId, u.username]));

    const data = roles.map((r) =>
      toClientRole(r, updaterMap.get(r.updUserId) ?? "system"),
    );

    return successResponse(data);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    let body: { name?: string; description?: string; permissions?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON, "Invalid JSON body.");
    }

    const name = body.name?.trim();
    if (!name || name.length < 2) {
      return badRequestResponse(ERR_ROLE_NAME_SHORT, "Role name must be at least 2 characters.");
    }

    const role = await prisma.sysRole.create({
      data: {
        roleName: name,
        roleType: "GLOBAL",
        contractDefineCode: "ADMIN",
        entityId: session.entity.entityId,
        remark: body.description?.trim() || null,
        creUserId: session.id,
        updUserId: session.id,
        permissions: body.permissions?.length
          ? {
              createMany: {
                data: body.permissions.map((code) => ({
                  permissionCode: code,
                  creUserId: session.id,
                })),
              },
            }
          : undefined,
      },
      include: {
        permissions: { select: { permissionCode: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return createdResponse(toClientRole(role, session.username));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
