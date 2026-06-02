import "server-only";

import { prisma } from "@cloud/db";
import { resolveEffectivePermissions } from "@cloud/platform-config";
import type {
  CurrentEntity,
  Session,
  SessionEntityRef,
  SessionRole,
} from "@cloud/permissions/server";
import { PLATFORM_ID } from "@/manifest";

// 构建登录会话快照：读 DB（用户 / 公司关系 / 契约 / 角色），用 platform-config 按
// 当前公司契约 + 角色/ADMIN 派生有效权限码。permissions 包不碰 manifest，派生在这里。
export type SessionSnapshotInput = Omit<Session, "loginAt" | "expireAt">;

type EntityUserWithEntity = {
  entityId: number;
  status: string;
  authorizingType: string;
  authorizingTimestamp: Date | null;
  entity: { entityId: number; entityName: string; status: string };
};

function normalizeAuthorizingType(value: string): "ADMIN" | "NORMAL" {
  return value === "ADMIN" ? "ADMIN" : "NORMAL";
}

function toEntityRef(entityUser: EntityUserWithEntity): SessionEntityRef {
  return {
    entityId: entityUser.entityId,
    entityName: entityUser.entity.entityName,
    authorizingType: normalizeAuthorizingType(entityUser.authorizingType),
    status: entityUser.status,
    authorizingFrom: entityUser.authorizingTimestamp?.toISOString() ?? null,
    authorizingTo: null,
  };
}

async function buildCurrentEntity(
  userId: number,
  entityUser: EntityUserWithEntity,
): Promise<CurrentEntity | null> {
  const entityId = entityUser.entityId;

  const contracts = await prisma.sysEntityContract.findMany({
    where: { authorizedEntityId: entityId, status: "ACTIVE" },
    select: { authorizedContractDefineCode: true },
  });
  if (contracts.length === 0) return null;
  const contractTypes = [...new Set(contracts.map((c) => c.authorizedContractDefineCode))];

  const authorizingType = normalizeAuthorizingType(entityUser.authorizingType);

  const userRoles = await prisma.sysUserRole.findMany({
    where: { userId, entityId },
    include: { role: true },
  });

  let roles: SessionRole[];
  let grantedRoleCodes: string[] = [];

  if (authorizingType === "ADMIN") {
    // ADMIN 无视角色取契约全量权限；角色仅用于展示
    roles = userRoles.map((ur) => ({
      roleId: ur.role.roleId,
      roleName: ur.role.roleName,
      roleType: ur.role.roleType,
    }));
  } else {
    const blacklist = await prisma.sysRoleContractBlacklist.findMany({
      where: { entityId, contractDefineCode: { in: contractTypes } },
      select: { roleId: true },
    });
    const blocked = new Set(blacklist.map((b) => b.roleId));

    const applicable = userRoles.filter((ur) => {
      const roleContract = ur.role.contractDefineCode;
      const contractOk = roleContract === null || contractTypes.includes(roleContract);
      return contractOk && !blocked.has(ur.roleId);
    });

    roles = applicable.map((ur) => ({
      roleId: ur.role.roleId,
      roleName: ur.role.roleName,
      roleType: ur.role.roleType,
    }));

    const rolePermissions = applicable.length
      ? await prisma.sysRolePermission.findMany({
          where: { roleId: { in: applicable.map((ur) => ur.roleId) } },
          select: { permissionCode: true },
        })
      : [];
    grantedRoleCodes = [...new Set(rolePermissions.map((p) => p.permissionCode))];
  }

  const permissions = resolveEffectivePermissions({
    platform: PLATFORM_ID,
    contracts: contractTypes,
    authorizingType,
    grantedRoleCodes,
  });

  return {
    entityId,
    entityName: entityUser.entity.entityName,
    contractTypes,
    authorizingType,
    roles,
    permissions,
  };
}

/**
 * 给定用户 + 目标公司，构建会话快照（不含 loginAt/expireAt，由 sessionStore 盖）。
 * - 用户无效 → null。
 * - currentEntityId 为 null 或目标公司无效/无 ACTIVE 契约 → currentEntity 为 null（partial）。
 */
export async function buildSessionSnapshot(
  userId: number,
  currentEntityId: number | null,
): Promise<SessionSnapshotInput | null> {
  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE" || !user.username) return null;

  const entityUsers = (await prisma.sysEntityUser.findMany({
    where: { userId },
    include: { entity: { select: { entityId: true, entityName: true, status: true } } },
  })) as EntityUserWithEntity[];

  const activeEntityUsers = entityUsers.filter(
    (eu) => eu.status === "ACTIVE" && eu.entity.status === "ACTIVE",
  );
  const entities = activeEntityUsers.map(toEntityRef);

  let currentEntity: CurrentEntity | null = null;
  if (currentEntityId !== null) {
    const target = activeEntityUsers.find((eu) => eu.entityId === currentEntityId);
    if (target) currentEntity = await buildCurrentEntity(userId, target);
  }

  return {
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    currentEntityId: currentEntity ? currentEntityId : null,
    currentEntity,
    entities,
    mfaPassed: true,
  };
}
