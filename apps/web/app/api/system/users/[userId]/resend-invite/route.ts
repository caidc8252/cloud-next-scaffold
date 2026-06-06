import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NO_PENDING_INVITE } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientInvite } from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

// 列表里待消费邀请的 id 形如 `invite-<operatorInviteId>`，这里解析出邀请 id。
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
      where: { operatorInviteId: inviteId, partnerId, status: "PENDING" },
    });
    if (!invite) throw new BusinessError(ERR_USER_NO_PENDING_INVITE, 404);

    const updated = await prisma.sysOperatorInvite.update({
      where: { operatorInviteId: invite.operatorInviteId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        updUserId: session.userId,
        resendCount: { increment: 1 },
      },
    });

    const inviterName =
      updated.inviterUserId === session.userId
        ? session.username
        : ((
            await prisma.sysUser.findUnique({
              where: { userId: updated.inviterUserId },
              select: { username: true },
            })
          )?.username ?? "system");

    return successResponse(toClientInvite(updated, inviterName));
  },
);
