import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_INVALID_ID } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { toggleUserLock } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 锁定 / 解锁某运营人员(partner-user 维度 ACTIVE ↔ LOCKED)。需要 users.lock;
 * 不能锁本人或 ADMIN 归属。
 */
export const POST = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.lock"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) throw new BusinessError(ERR_INVALID_ID);

    return successResponse(await toggleUserLock(session, userId));
  },
);
