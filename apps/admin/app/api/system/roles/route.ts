import { BusinessError } from "@cloud/request";
import { successResponse, createdResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_ROLE_NAME_SHORT } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { createRoleSchema } from "@/service/roles/schemas/roles.schema";
import { listRoles, createRole } from "@/service/roles/server/roles.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 当前 partner 可见的角色列表(自有角色 + 全局角色,含绑定用户数)。需要 roles.VIEW。
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["roles.VIEW"] });
  return successResponse(await listRoles(session.currentPartyId));
});

/**
 * 新建角色。需要 roles.ADD。
 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["roles.ADD"] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = createRoleSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ROLE_NAME_SHORT);

  return createdResponse(await createRole(session, parsed.data));
});
