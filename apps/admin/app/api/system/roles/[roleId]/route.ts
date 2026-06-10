import { BusinessError } from "@cloud/request";
import { successResponse, noContentResponse } from "@cloud/request/server";
import { ERR_BAD_REQUEST, ERR_INVALID_ID, ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { updateRoleSchema } from "@/service/roles/schemas/roles.schema";
import { updateRole, deleteRole } from "@/service/roles/server/roles.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 更新角色(名称 / 描述 / 权限)。需要 roles.UPD;内置角色仅权限可改,跨 partner 角色不可见。
 */
export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["roles.UPD"] });
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

/**
 * 删除角色。需要 roles.DELETE;内置角色不可删,仍被用户绑定的角色不可删(409)。
 */
export const DELETE = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["roles.DELETE"] });
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) throw new BusinessError(ERR_INVALID_ID);

    await deleteRole(session, roleId);
    return noContentResponse();
  },
);
