import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import {
  ERR_INVALID_ID,
  ERR_INVALID_JSON,
  ERR_USER_NO_PENDING_INVITE,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toClientInvite, parseRoleIds } from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

// 列表里待消费邀请的 id 形如 `invite-<operatorInviteId>`，这里解析出邀请 id。
// 邀请不是用户，其预分配角色落在 sys_operator_invite.roles，不能走用户 PUT。
function parseInviteId(rawId: string): number {
  return Number(rawId.replace(/^invite-/, ""));
}

export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.CHANGE_ROLE"] });
    const { userId: rawId } = await params;
    const inviteId = parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);

    let body: { roleIds?: string[] };
    try {
      body = await req.json();
    } catch {
      throw new BusinessError(ERR_INVALID_JSON);
    }

    const partnerId = session.currentPartnerId;
    const invite = await prisma.sysOperatorInvite.findFirst({
      where: { operatorInviteId: inviteId, partnerId, status: "PENDING" },
    });
    if (!invite) throw new BusinessError(ERR_USER_NO_PENDING_INVITE, 404);

    const roleIds = parseRoleIds(body.roleIds);
    const updated = await prisma.sysOperatorInvite.update({
      where: { operatorInviteId: invite.operatorInviteId },
      data: {
        roles: roleIds.map((roleId) => ({ roleId })),
        updUserId: session.userId,
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
