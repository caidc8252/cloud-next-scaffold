import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import { successResponse, createdResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_ROLE_NAME_SHORT } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientRole } from "@/app/(portal)/system/roles/_server/role-mapper";
import { extractRoleIds } from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

// 统计当前 partner 下每个角色被多少用户绑定（角色绑定走 sys_partner_user.roles JSONB）。
async function countRoleOperators(partnerId: number): Promise<Map<number, number>> {
  const links = await prisma.sysPartnerUser.findMany({
    where: { partnerId, status: { in: ["ACTIVE", "LOCKED"] } },
    select: { roles: true },
  });
  const counts = new Map<number, number>();
  for (const link of links) {
    for (const roleId of extractRoleIds(link.roles)) {
      const id = Number(roleId);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["roles.VIEW"] });
  const roles = await prisma.sysRole.findMany({
    where: { OR: [{ partnerId: session.currentPartnerId }, { partnerId: null }] },
    orderBy: { creTime: "asc" },
  });

  const counts = await countRoleOperators(session.currentPartnerId);

  const updaterIds = [...new Set(roles.map((r) => r.updUserId))];
  const updaters =
    updaterIds.length > 0
      ? await prisma.sysUser.findMany({
          where: { userId: { in: updaterIds } },
          select: { userId: true, username: true },
        })
      : [];
  const updaterMap = new Map(updaters.map((u) => [u.userId, u.username]));

  const data = roles.map((r) =>
    toClientRole(r, updaterMap.get(r.updUserId) ?? "system", counts.get(r.roleId) ?? 0),
  );

  return successResponse(data);
});

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["roles.ADD"] });
  let body: { name?: string; description?: string; permissions?: string[] };
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const name = body.name?.trim();
  if (!name || name.length < 2) {
    throw new BusinessError(ERR_ROLE_NAME_SHORT);
  }

  const role = await prisma.sysRole.create({
    data: {
      roleName: name,
      roleType: "GLOBAL",
      contractType: "ADMIN",
      partnerId: session.currentPartnerId,
      remark: body.description?.trim() || null,
      permissionCodes: body.permissions ?? [],
      creUserId: session.userId,
      updUserId: session.userId,
    },
  });

  return createdResponse(toClientRole(role, session.username, 0));
});
