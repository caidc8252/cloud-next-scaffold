import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import { noContentResponse } from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_CANCEL_NOT_PENDING } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { withApiHandler } from "@/lib/api-handler";

// 列表里待消费邀请的 id 形如 `invite-<operatorInviteId>`。
function parseInviteId(rawId: string): number {
  return Number(rawId.replace(/^invite-/, ""));
}

export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.INVITE"] });
    const { userId: rawId } = await params;
    const inviteId = parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);

    const partnerId = session.currentPartnerId;
    const invite = await prisma.sysOperatorInvite.findFirst({
      where: { operatorInviteId: inviteId, partnerId },
    });
    if (!invite || invite.status !== "PENDING") {
      throw new BusinessError(ERR_USER_CANCEL_NOT_PENDING);
    }

    await prisma.sysOperatorInvite.delete({
      where: { operatorInviteId: invite.operatorInviteId },
    });

    return noContentResponse();
  },
);
