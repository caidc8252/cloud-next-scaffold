import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_ID } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { resetUserPassword } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 为某运营人员签发密码重置 token(存 Redis,72h)。需要 users.resetPassword;
 * 不能对本人或 ADMIN 归属操作,且目标必须是 ACTIVE。
 */
export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.resetPassword"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) throw new BusinessError(ERR_INVALID_ID);

    return successResponse(await resetUserPassword(session, userId));
  },
);
