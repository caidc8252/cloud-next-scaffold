import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_BAD_REQUEST, ERR_INVALID_ID, ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { setInviteRolesSchema } from "@/service/users/schemas/users.schema";
import { setInviteRoles, parseInviteId } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 设置待消费邀请的预分配角色(邀请不是用户,角色落 sys_operator_invite.roles,不走用户 PUT)。
 * id 形如 `invite-<operatorInviteId>`。需要 users.CHANGE_ROLE。
 */
export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.CHANGE_ROLE"] });
    const { userId: rawId } = await params;
    const inviteId = parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new BusinessError(ERR_INVALID_JSON);
    }

    const parsed = setInviteRolesSchema.safeParse(raw);
    if (!parsed.success) throw new BusinessError(ERR_BAD_REQUEST);

    return successResponse(await setInviteRoles(session, inviteId, parsed.data));
  },
);
