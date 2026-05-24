import { randomBytes } from "node:crypto";
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  createdResponse,
} from "@cloud/request/server";
import { getSession } from "../../../../lib/auth";
import { toClientUser, USER_INCLUDE, collectAuxUserIds } from "../../../../lib/user-mapper";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  const entityId = session.entity.entityId;

  // All users belonging to this entity
  const entityUserLinks = await prisma.sysEntityUser.findMany({
    where: { entityId, status: "ACTIVE" },
    select: { userId: true },
  });
  const userIds = entityUserLinks.map((eu) => eu.userId);
  if (userIds.length === 0) return successResponse([]);

  const rows = await prisma.sysUser.findMany({
    where: { userId: { in: userIds } },
    include: {
      ...USER_INCLUDE,
      entityUsers: { where: { entityId }, select: { authorizingType: true } },
      userRoles: { where: { entityId }, select: { roleId: true } },
    },
    orderBy: { creTime: "asc" },
  });

  const auxIds = collectAuxUserIds(rows);
  const auxUsers = auxIds.length > 0
    ? await prisma.sysUser.findMany({ where: { userId: { in: auxIds } }, select: { userId: true, username: true } })
    : [];
  const nameMap = new Map(auxUsers.map((u) => [u.userId, u.username ?? "system"]));

  return successResponse(rows.map((r) => toClientUser(r, nameMap, nameMap)));
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  let body: { email?: string; roleIds?: string[]; remark?: string };
  try {
    body = await req.json();
  } catch {
    return badRequestResponse("Invalid JSON body.");
  }

  const email = body.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequestResponse("A valid email is required.");
  }

  // Check duplicate email in invites
  const existing = await prisma.sysInvite.findFirst({
    where: { email, status: "PENDING" },
  });
  if (existing) return badRequestResponse("An active invitation already exists for this email.");

  const entityId = session.entity.entityId;
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);

  // Create PENDING user + invite + pre-assigned roles in one transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.sysUser.create({
      data: {
        username: null,
        passwordHash: "",
        status: "PENDING",
        remark: body.remark?.trim() || null,
        creUserId: session.id,
        updUserId: session.id,
      },
    });

    // Entity membership
    await tx.sysEntityUser.create({
      data: {
        entityId,
        userId: newUser.userId,
        authorizingType: "NORMAL",
        status: "ACTIVE",
        authorizingTimestamp: new Date(),
        authorizingUserId: session.id,
        creUserId: session.id,
      },
    });

    // Invite record
    await tx.sysInvite.create({
      data: {
        userId: newUser.userId,
        email,
        token,
        expiresAt,
        creUserId: session.id,
      },
    });

    // Pre-assign roles
    const roleIds = (body.roleIds ?? []).map(Number).filter(Number.isFinite);
    if (roleIds.length > 0) {
      await tx.sysUserRole.createMany({
        data: roleIds.map((roleId) => ({
          entityId,
          userId: newUser.userId,
          roleId,
          creUserId: session.id,
        })),
      });
    }

    return newUser;
  });

  // Re-fetch with full includes
  const full = await prisma.sysUser.findUniqueOrThrow({
    where: { userId: user.userId },
    include: {
      ...USER_INCLUDE,
      entityUsers: { where: { entityId }, select: { authorizingType: true } },
      userRoles: { where: { entityId }, select: { roleId: true } },
    },
  });

  const nameMap = new Map([[session.id, session.username]]);
  return createdResponse(toClientUser(full, nameMap, nameMap));
}
