import "server-only";

import { prisma } from "@cloud/db";
import type { Session, SessionPartnerRef, SessionRole } from "@cloud/permissions/server";
import { getMenus } from "@/manifest";
import { resolveEffectivePermissions } from "@/manifest/select";

// 构建登录会话快照：读 DB（用户 / 公司关系 / 契约 / 角色），用 platform-config 按
// 当前公司契约 + 角色/ADMIN 派生有效权限码。permissions 包不碰 manifest，派生在这里。
export type SessionSnapshotInput = Omit<Session, "loginAt" | "expireAt">;

// 当前公司上下文（内部用；最终平铺进 Session 顶层）。
type CurrentContext = {
  partnerName: string;
  contractTypes: string[];
  authorizingType: "ADMIN" | "NORMAL";
  roles: SessionRole[];
  permissions: string[];
};

type PartnerUserWithPartner = {
  partnerId: number;
  status: string;
  authorizingType: string;
  authorizingTimestamp: Date | null;
  partner: { partnerId: number; partnerName: string; status: string };
};

function normalizeAuthorizingType(value: string): "ADMIN" | "NORMAL" {
  return value === "ADMIN" ? "ADMIN" : "NORMAL";
}

function toPartnerRef(partnerUser: PartnerUserWithPartner): SessionPartnerRef {
  return {
    partnerId: partnerUser.partnerId,
    partnerName: partnerUser.partner.partnerName,
    authorizingType: normalizeAuthorizingType(partnerUser.authorizingType),
    status: partnerUser.status,
    authorizingFrom: partnerUser.authorizingTimestamp?.toISOString() ?? null,
    authorizingTo: null,
  };
}

async function buildCurrentContext(
  userId: number,
  partnerUser: PartnerUserWithPartner,
): Promise<CurrentContext | null> {
  const partnerId = partnerUser.partnerId;

  const contracts = await prisma.sysPartnerContract.findMany({
    where: { authorizedPartnerId: partnerId, status: "ACTIVE" },
    select: { authorizedContractDefineCode: true },
  });
  if (contracts.length === 0) return null;
  const contractTypes = [...new Set(contracts.map((c) => c.authorizedContractDefineCode))];

  const authorizingType = normalizeAuthorizingType(partnerUser.authorizingType);

  const userRoles = await prisma.sysUserRole.findMany({
    where: { userId, partnerId },
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
      where: { partnerId, contractDefineCode: { in: contractTypes } },
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

  const menus = getMenus(contractTypes);
  const permissions = resolveEffectivePermissions({
    menus,
    authorizingType,
    grantedRoleCodes,
  });

  return {
    partnerName: partnerUser.partner.partnerName,
    contractTypes,
    authorizingType,
    roles,
    permissions,
  };
}

/**
 * 给定用户 + 目标公司，构建会话快照（不含 loginAt/expireAt，由 sessionStore 盖）。
 * - 用户无效 → null。
 * - currentPartnerId 为 null 或目标公司无效/无 ACTIVE 契约 → currentPartner 为 null（partial）。
 */
export async function buildSessionSnapshot(
  userId: number,
  currentPartnerId: number | null,
): Promise<SessionSnapshotInput | null> {
  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE" || !user.username) return null;

  const partnerUsers = (await prisma.sysPartnerUser.findMany({
    where: { userId },
    include: { partner: { select: { partnerId: true, partnerName: true, status: true } } },
  })) as PartnerUserWithPartner[];

  const activePartnerUsers = partnerUsers.filter(
    (eu) => eu.status === "ACTIVE" && eu.partner.status === "ACTIVE",
  );
  const partners = activePartnerUsers.map(toPartnerRef);

  let current: CurrentContext | null = null;
  if (currentPartnerId !== null) {
    const target = activePartnerUsers.find((eu) => eu.partnerId === currentPartnerId);
    if (target) current = await buildCurrentContext(userId, target);
  }

  return {
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    currentPartnerId: current ? currentPartnerId : null,
    partnerName: current?.partnerName ?? null,
    contractTypes: current?.contractTypes ?? [],
    authorizingType: current?.authorizingType ?? null,
    roles: current?.roles ?? [],
    permissions: current?.permissions ?? [],
    partners,
    mfaPassed: true,
  };
}
