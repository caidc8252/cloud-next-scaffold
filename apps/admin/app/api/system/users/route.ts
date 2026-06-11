import { BusinessError } from "@cloud/request";
import { successResponse, createdResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_USER_EMAIL_INVALID } from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { createInviteSchema } from "@/service/users/schemas/users.schema";
import { listUsersAndInvites, createInvite } from "@/service/users/server/users.service";
import { withApiHandler } from "@/lib/api-handler";

/**
 * 当前 partner 下的运营人员列表(在册用户 + 待消费邀请合成的 PENDING 伪条目)。
 * 系统管理「用户」页加载,需要 users.VIEW。
 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["users.VIEW"] });
  return successResponse(await listUsersAndInvites(session.currentPartyId));
});

/**
 * 邀请一名运营人员加入当前 partner(不预建用户,消费邀请时才建)。需要 users.INVITE。
 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["users.INVITE"] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const parsed = createInviteSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_USER_EMAIL_INVALID);

  return createdResponse(await createInvite(session, parsed.data));
});
