import { z } from "zod";
import { prisma } from "@cloud/db";
import { verifyPassword } from "@cloud/security/server";
import { createSession } from "@cloud/permissions/server";
import { successResponse, badRequestResponse, errorResponse } from "@cloud/request/server";
import {
  ERR_AUTH_ACCOUNT_LOCKED,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_MISSING_FIELDS,
} from "@/lib/auth-error-codes";
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
    return badRequestResponse(ERR_AUTH_MISSING_FIELDS, "Enter both account and password.");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResponse(ERR_AUTH_MISSING_FIELDS, "Enter both account and password.");
  }

  const user = await prisma.sysUser.findUnique({
    where: { username: parsed.data.account },
  });

  if (!user) {
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, "Incorrect account or password.", 401);
  }

  // 校验锁定状态
  if (user.status === "LOCKED") {
    if (
      user.passwordErrorLockExpiredTimestamp &&
      user.passwordErrorLockExpiredTimestamp > new Date()
    ) {
      return errorResponse(
        ERR_AUTH_ACCOUNT_LOCKED,
        "Account is locked. Please try again later.",
        403,
      );
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
    return errorResponse(ERR_AUTH_INVALID_CREDENTIALS, "Incorrect account or password.", 401);
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

  // 聚合可用的 entity-user 关系
  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: user.userId },
    include: { entity: true },
  });

  const activeEntityUsers = entityUsers.filter(
    (eu) => eu.status === "ACTIVE" && eu.entity.status === "ACTIVE",
  );

  if (activeEntityUsers.length === 1) {
    await createSession(user.userId, activeEntityUsers[0].entityId);
    return successResponse({ redirectTo: "/" });
  }

  if (activeEntityUsers.length > 1) {
    await createSession(user.userId, null);
    return successResponse({ redirectTo: "/select-entity" });
  }

  // 无可用组织
  await createSession(user.userId, null);
  return successResponse({ redirectTo: "/locked" });
});
