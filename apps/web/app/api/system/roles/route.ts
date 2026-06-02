import { prisma } from "@cloud/db";
import { successResponse, badRequestResponse, createdResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_ROLE_NAME_SHORT } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["roles.VIEW"] });
  const roles = await prisma.sysRole.findMany({
    where: { OR: [{ partnerId: session.currentPartnerId }, { partnerId: null }] },
    include: {
      permissions: { select: { permissionCode: true } },
      _count: { select: { userRoles: true } },
    },
    orderBy: { creTime: "asc" },
  });

  const updaterIds = [...new Set(roles.map((r) => r.updUserId))];
  const updaters =
    updaterIds.length > 0
      ? await prisma.sysUser.findMany({
          where: { userId: { in: updaterIds } },
          select: { userId: true, username: true },
        })
      : [];
  const updaterMap = new Map(updaters.map((u) => [u.userId, u.username]));

  const data = roles.map((r) => toClientRole(r, updaterMap.get(r.updUserId) ?? "system"));

  return successResponse(data);
});

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["roles.ADD"] });
  let body: { name?: string; description?: string; permissions?: string[] };
  try {
    body = await req.json();
  } catch {
    return badRequestResponse(ERR_INVALID_JSON);
  }

  const name = body.name?.trim();
  if (!name || name.length < 2) {
    return badRequestResponse(ERR_ROLE_NAME_SHORT);
  }

  const role = await prisma.sysRole.create({
    data: {
      roleName: name,
      roleType: "GLOBAL",
      contractDefineCode: "ADMIN",
      partnerId: session.currentPartnerId,
      remark: body.description?.trim() || null,
      creUserId: session.userId,
      updUserId: session.userId,
      permissions: body.permissions?.length
        ? {
            createMany: {
              data: body.permissions.map((code) => ({
                permissionCode: code,
                creUserId: session.userId,
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
});
