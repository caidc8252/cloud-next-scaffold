import "server-only";

import { prisma } from "@cloud/db";
import { createSessionHandoffToken, updateSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import {
  ERR_AUTH_INVALID_PARTNER,
  ERR_AUTH_NOT_AUTHENTICATED,
  ERR_AUTH_PARTNER_REQUIRED,
} from "./auth-error-codes";
import { getAdminSessionHandoffUrl } from "./platform-routing";
import { buildSessionSnapshot } from "./session-snapshot";

type PartialSession = {
  userId: number;
};

// portal 是统一登录入口：选择 partner 后在这里一次性把 partial session
// 升级成完整 session，然后跳转到具体平台，admin 不再需要 activate 中转页。
export async function selectPartnerForPlatform(
  partial: PartialSession | null,
  body: { partnerId?: number } | null,
): Promise<{ redirectTo: string }> {
  if (!partial) {
    throw new BusinessError(ERR_AUTH_NOT_AUTHENTICATED, 401);
  }

  const partnerId = body?.partnerId;
  if (typeof partnerId !== "number" || !Number.isInteger(partnerId) || partnerId <= 0) {
    throw new BusinessError(ERR_AUTH_PARTNER_REQUIRED);
  }

  const partnerUser = await prisma.sysPartnerUser.findUnique({
    where: {
      partnerId_userId: {
        partnerId,
        userId: partial.userId,
      },
    },
    include: { partner: { select: { status: true } } },
  });

  if (!partnerUser || partnerUser.status !== "ACTIVE" || partnerUser.partner.status !== "ACTIVE") {
    throw new BusinessError(ERR_AUTH_INVALID_PARTNER);
  }

  const snapshot = await buildSessionSnapshot(partial.userId, partnerId);
  if (!snapshot || snapshot.currentPartnerId === null) {
    throw new BusinessError(ERR_AUTH_INVALID_PARTNER);
  }

  await updateSession(snapshot);
  // partner 选择完成后仍从 portal 跳 admin，需要用一次性 token 完成跨 host 会话交接。
  const handoffToken = await createSessionHandoffToken();
  if (!handoffToken) {
    throw new BusinessError(ERR_AUTH_NOT_AUTHENTICATED, 401);
  }

  return {
    redirectTo: getAdminSessionHandoffUrl(handoffToken),
  };
}
