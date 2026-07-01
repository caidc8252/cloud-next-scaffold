import { BusinessError } from "@cloud/request";
import { successResponse, createdResponse, noContentResponse } from "@cloud/request/server";
import {
  ERR_INVALID_JSON,
  ERR_USER_EMAIL_INVALID,
  ERR_BAD_REQUEST,
  ERR_INVALID_ID,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { createInviteSchema, updateUserSchema, setInviteRolesSchema } from "../schema/users.schema";
import * as svc from "./users.service";
import { withApiHandler } from "@/lib/api-handler";

// 多个 [userId]/* 子路由共用本 controller：handler 具名导出,各 route 以 `named as METHOD` 再导出。

/** 当前 partner 下运营人员列表(在册 + 待消费邀请合成的 PENDING 伪条目)。需要 users.view。 */
export const listUsers = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["system.users.user.view"] });
  return successResponse(await svc.listUsersAndInvites(session.currentPartyId));
});

/** 邀请一名运营人员加入当前 partner。需要 users.invite。 */
export const inviteUser = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["system.users.user.invite"] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = createInviteSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_USER_EMAIL_INVALID);
  return createdResponse(await svc.createInvite(session, parsed.data));
});

/** 更新某运营人员的 remark 与/或角色。需要 users.update(改角色额外 users.changeRole)。 */
export const editUser = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["system.users.user.update"] });
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
    return successResponse(await svc.updateUser(session, userId, parsed.data));
  },
);

/** 锁定 / 解锁某运营人员。需要 users.lock;不能锁本人或 ADMIN 归属。 */
export const lockUser = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["system.users.user.lock"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) throw new BusinessError(ERR_INVALID_ID);
    return successResponse(await svc.toggleUserLock(session, userId));
  },
);

/** 为某运营人员签发密码重置 token。需要 users.resetPassword。 */
export const resetPassword = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["system.users.user.resetPassword"] });
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) throw new BusinessError(ERR_INVALID_ID);
    return successResponse(await svc.resetUserPassword(session, userId));
  },
);

/** 撤销一条待消费邀请。id 形如 `invite-<operatorInviteId>`。需要 users.invite。 */
export const cancelInvite = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["system.users.user.invite"] });
    const { userId: rawId } = await params;
    const inviteId = svc.parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);
    await svc.cancelInvite(session, inviteId);
    return noContentResponse();
  },
);

/** 重发一条待消费邀请(续期 + resendCount+1)。需要 users.invite。 */
export const resendInvite = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["system.users.user.invite"] });
    const { userId: rawId } = await params;
    const inviteId = svc.parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);
    return successResponse(await svc.resendInvite(session, inviteId));
  },
);

/** 重新生成一条未过期邀请(换 token + 续期 + 重发)。需要 users.invite。 */
export const regenerateInvite = withApiHandler(
  async (_req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["system.users.user.invite"] });
    const { userId: rawId } = await params;
    const inviteId = svc.parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);
    return successResponse(await svc.regenerateInvite(session, inviteId));
  },
);

/** 设置待消费邀请的预分配角色。id 形如 `invite-<operatorInviteId>`。需要 users.changeRole。 */
export const setInviteRoles = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await assertPermissions({ all: ["system.users.user.changeRole"] });
    const { userId: rawId } = await params;
    const inviteId = svc.parseInviteId(rawId);
    if (!Number.isFinite(inviteId)) throw new BusinessError(ERR_INVALID_ID);
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new BusinessError(ERR_INVALID_JSON);
    }
    const parsed = setInviteRolesSchema.safeParse(raw);
    if (!parsed.success) throw new BusinessError(ERR_BAD_REQUEST);
    return successResponse(await svc.setInviteRoles(session, inviteId, parsed.data));
  },
);
