import { BusinessError } from "@cloud/request";
import { successResponse } from "@cloud/request/server";
import { ERR_BAD_REQUEST, ERR_INVALID_ID, ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { updateUserSchema } from "@/service/users/schemas/users.schema";
import { updateUser } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 更新某运营人员在当前 partner 下的 remark 与/或角色。需要 users.UPD;
 * 改角色额外需要 users.CHANGE_ROLE(service 内做范围校验),受保护用户只能改 remark。
 */
export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["users.UPD"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) throw new BusinessError(ERR_INVALID_ID);

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new BusinessError(ERR_INVALID_JSON);
    }

    const parsed = updateUserSchema.safeParse(raw);
    if (!parsed.success) throw new BusinessError(ERR_BAD_REQUEST);

    return successResponse(await updateUser(session, userId, parsed.data));
  },
);
