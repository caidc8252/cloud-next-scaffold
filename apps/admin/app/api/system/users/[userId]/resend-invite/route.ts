import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_ID } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { resendInvite, parseInviteId } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 重发一条待消费邀请(续期 + resendCount+1)。id 形如 `invite-<operatorInviteId>`。需要 users.INVITE。
 */
export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.INVITE"] });
    const { userId: rawId } = await params;
    const inviteId = parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);

    return successResponse(await resendInvite(session, inviteId));
  },
);
