import { BusinessError } from "@cloud/request";
import { noContentResponse } from "@cloud/request/server";
import { ERR_INVALID_ID } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { cancelInvite, parseInviteId } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 撤销一条待消费邀请。列表里邀请 id 形如 `invite-<operatorInviteId>`。需要 users.invite。
 */
export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.invite"] });
    const { userId: rawId } = await params;
    const inviteId = parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);

    await cancelInvite(session, inviteId);
    return noContentResponse();
  },
);
