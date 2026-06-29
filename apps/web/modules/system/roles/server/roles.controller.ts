import { BusinessError } from "@cloud/request";
import { successResponse, createdResponse, noContentResponse } from "@cloud/request/server";
import {
  ERR_INVALID_JSON,
  ERR_ROLE_NAME_SHORT,
  ERR_BAD_REQUEST,
  ERR_INVALID_ID,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { createRoleSchema, updateRoleSchema } from "../schema/roles.schema";
import { listRoles, createRole, updateRole, deleteRole } from "./roles.service";
import { withApiHandler } from "@/lib/api-handler";

/** 当前 partner 可见的角色列表(自有 + 全局,含绑定用户数)。需要 roles.view。 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["system.roles.role.view"] });
  return successResponse(await listRoles(session.currentPartyId, session.contractTypes));
});

/** 新建角色。需要 roles.add。 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["system.roles.role.create"] });
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

/** 更新角色(名称/描述/权限)。需要 roles.update。 */
export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["system.roles.role.update"] });
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) throw new BusinessError(ERR_INVALID_ID);
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new BusinessError(ERR_INVALID_JSON);
    }
    const parsed = updateRoleSchema.safeParse(raw);
    if (!parsed.success) throw new BusinessError(ERR_BAD_REQUEST);
    return successResponse(await updateRole(session, roleId, parsed.data));
  },
);

/** 删除角色。需要 roles.delete;内置不可删,仍被绑定不可删(409)。 */
export const DELETE = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["system.roles.role.delete"] });
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) throw new BusinessError(ERR_INVALID_ID);
    await deleteRole(session, roleId);
    return noContentResponse();
  },
);
