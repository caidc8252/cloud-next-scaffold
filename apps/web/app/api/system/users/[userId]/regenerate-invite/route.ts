/** @e2e-cell feature=invite-user kind=route */
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_ID } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { regenerateInvite, parseInviteId } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 重新生成一条未过期邀请（换 token + 续期 + 重发）。id 形如 `invite-<operatorInviteId>`。需要 users.invite。
 */
export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.invite"] });
    const { userId: rawId } = await params;
    const inviteId = parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);
    return successResponse(await regenerateInvite(session, inviteId));
  },
);
