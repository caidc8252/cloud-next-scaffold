import { z } from "zod";
import { prisma } from "@cloud/db";
import { verifyPassword } from "@cloud/security/server";
import { createSession } from "@cloud/permissions/server";
import { buildSessionSnapshot } from "@/lib/session-snapshot";
import { successResponse, badRequestResponse, errorResponse } from "@cloud/request/server";
import {
  ERR_AUTH_ACCOUNT_LOCKED,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_CREDENTIALS_REQUIRED,
} from "@/lib/auth-error-codes";
import "@/lib/auth-error-messages";
import { withApiHandler } from "@/lib/api-handler";

const loginSchema = z.object({
  account: z.string().trim().min(1),
  password: z.string().min(1),
});

/** @e2e-cell feature=auth kind=auth-boundary */
export const POST = withApiHandler(async (req: Request) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequestResponse(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse(ERR_AUTH_CREDENTIALS_REQUIRED);
  }

  const user = await prisma.sysUser.findUnique({
    where: { username: parsed.data.account },
  });

  if (!user) {
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, undefined, 401);
  }

  // 校验锁定状态
  if (user.status === "LOCKED") {
    if (
      user.passwordErrorLockExpiredTimestamp &&
      user.passwordErrorLockExpiredTimestamp > new Date()
    ) {
      return errorResponse(ERR_AUTH_ACCOUNT_LOCKED, undefined, 403);
    }
    // 锁定已过期，重置
    await prisma.sysUser.update({
      where: { userId: user.userId },
      data: {
        status: "ACTIVE",
        passwordErrorTimes: 0,
        passwordErrorLockExpiredTimestamp: null,
      },
    });
  }

  // 校验密码
  const isValid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!isValid) {
    const errorTimes = user.passwordErrorTimes + 1;
    const updateData: Record<string, unknown> = { passwordErrorTimes: errorTimes };
    // 连续 5 次失败后锁定 30 分钟
    if (errorTimes >= 5) {
      updateData.status = "LOCKED";
      updateData.passwordErrorLockExpiredTimestamp = new Date(Date.now() + 30 * 60 * 1000);
    }
    await prisma.sysUser.update({
      where: { userId: user.userId },
      data: updateData,
    });
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, undefined, 401);
  }

  // 登录成功：重置错误计数，更新最后登录时间
  await prisma.sysUser.update({
    where: { userId: user.userId },
    data: {
      passwordErrorTimes: 0,
      passwordErrorLockExpiredTimestamp: null,
      lastLoginAt: new Date(),
    },
  });

  // 聚合可用的 partner-user 关系
  const partnerUsers = await prisma.sysPartnerUser.findMany({
    where: { userId: user.userId },
    include: { partner: true },
  });

  const activePartnerUsers = partnerUsers.filter(
    (eu) => eu.status === "ACTIVE" && eu.partner.status === "ACTIVE",
  );

  // 单公司直接进入并算好权限快照；多公司先建 partial 快照再去选公司
  const currentPartnerId =
    activePartnerUsers.length === 1 ? activePartnerUsers[0].partnerId : null;
  const snapshot = await buildSessionSnapshot(user.userId, currentPartnerId);
  if (!snapshot) {
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, undefined, 401);
  }
  await createSession(snapshot);

  if (activePartnerUsers.length === 1) {
    return successResponse({ redirectTo: "/" });
  }
  if (activePartnerUsers.length > 1) {
    return successResponse({ redirectTo: "/select-partner" });
  }
  return successResponse({ redirectTo: "/locked" });
});
