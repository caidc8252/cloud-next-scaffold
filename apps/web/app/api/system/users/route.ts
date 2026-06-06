import { randomBytes } from "node:crypto";
import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import { successResponse, createdResponse } from "@cloud/request/server";
import {
  ERR_INVALID_JSON,
  ERR_USER_EMAIL_INVALID,
  ERR_USER_EMAIL_TAKEN,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import {
  toClientUser,
  toClientInvite,
  userPartnerInclude,
} from "@/app/(portal)/system/users/_server/user-mapper";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["users.VIEW"] });
  const partnerId = session.currentPartnerId;

  // 1. 真实用户（当前 partner 下 ACTIVE / LOCKED 的归属关系）
  const partnerUserLinks = await prisma.sysPartnerUser.findMany({
    where: { partnerId, status: { in: ["ACTIVE", "LOCKED"] } },
    select: { userId: true },
  });
  const userIds = partnerUserLinks.map((eu) => eu.userId);
  const userRows = userIds.length
    ? await prisma.sysUser.findMany({
        where: { userId: { in: userIds } },
        include: userPartnerInclude(partnerId),
        orderBy: { creTime: "asc" },
      })
    : [];

  // 2. 待消费邀请（sys_operator_invite，无占位用户）
  const invites = await prisma.sysOperatorInvite.findMany({
    where: { partnerId, status: "PENDING" },
    orderBy: { creTime: "desc" },
  });
  const inviterIds = [...new Set(invites.map((inv) => inv.inviterUserId))];
  const inviters = inviterIds.length
    ? await prisma.sysUser.findMany({
        where: { userId: { in: inviterIds } },
        select: { userId: true, username: true },
      })
    : [];
  const inviterMap = new Map(inviters.map((u) => [u.userId, u.username]));

  const data = [
    ...userRows.map((r) => toClientUser(r)),
    ...invites.map((inv) => toClientInvite(inv, inviterMap.get(inv.inviterUserId) ?? "system")),
  ];

  return successResponse(data);
});

export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["users.INVITE"] });
  let body: { email?: string; roleIds?: string[] };
  try {
    body = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }

  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BusinessError(ERR_USER_EMAIL_INVALID);
  }

  const partnerId = session.currentPartnerId;

  const existing = await prisma.sysOperatorInvite.findFirst({
    where: { partnerId, inviteEmail: email, status: "PENDING" },
  });
  if (existing) throw new BusinessError(ERR_USER_EMAIL_TAKEN);

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const roleIds = [...new Set((body.roleIds ?? []).map(Number).filter(Number.isFinite))];

  const invite = await prisma.sysOperatorInvite.create({
    data: {
      partnerId,
      inviterUserId: session.userId,
      inviteEmail: email,
      roles: roleIds.map((roleId) => ({ roleId })),
      token,
      expiresAt,
      creUserId: session.userId,
    },
  });

  return createdResponse(toClientInvite(invite, session.username));
});
