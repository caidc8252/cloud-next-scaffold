import "server-only";

import { prisma } from "@cloud/db";
import type { Session, SessionPartnerRef, SessionRole } from "@cloud/permissions/server";
import { getMenus } from "@/manifest";
import { resolveEffectivePermissions } from "@/manifest/select";

export type SessionSnapshotInput = Omit<Session, "loginAt" | "expireAt">;

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
  roles: unknown;
  partner: { partnerId: number; partnerName: string; status: string };
};

function normalizeAuthorizingType(value: string): "ADMIN" | "NORMAL" {
  return value === "ADMIN" ? "ADMIN" : "NORMAL";
}

function extractRoleIds(roles: unknown): number[] {
  if (!Array.isArray(roles)) return [];
  const ids = roles
    .map((role) =>
      role && typeof role === "object" ? (role as { roleId?: unknown }).roleId : undefined,
    )
    .filter((roleId): roleId is number => typeof roleId === "number");
  return [...new Set(ids)];
}

function extractPermissionCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  return codes.filter((code): code is string => typeof code === "string");
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
  partnerUser: PartnerUserWithPartner,
): Promise<CurrentContext | null> {
  const partnerId = partnerUser.partnerId;

  const contracts = await prisma.sysPartnerContract.findMany({
    where: { authorizedPartnerId: partnerId, status: "ACTIVE" },
    select: { authorizedContractType: true },
  });
  if (contracts.length === 0) return null;
  const contractTypes = [...new Set(contracts.map((contract) => contract.authorizedContractType))];

  const authorizingType = normalizeAuthorizingType(partnerUser.authorizingType);
  const roleIds = extractRoleIds(partnerUser.roles);
  const userRoles = roleIds.length
    ? await prisma.sysRole.findMany({
        where: { roleId: { in: roleIds } },
      })
    : [];

  let roles: SessionRole[];
  let grantedRoleCodes: string[] = [];

  // ADMIN partner 用户只受有效合约限制；NORMAL 用户还要经过角色合约类型
  // 和 partner role blocklist 过滤，最后再从角色 permissionCodes 派生权限。
  if (authorizingType === "ADMIN") {
    roles = userRoles.map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      roleType: role.roleType,
    }));
  } else {
    const blacklist = await prisma.sysPartnerRoleBlocklist.findMany({
      where: { partnerId, contractType: { in: contractTypes } },
      select: { roleId: true },
    });
    const blocked = new Set(blacklist.map((item) => item.roleId));

    const applicable = userRoles.filter(
      (role) => contractTypes.includes(role.contractType) && !blocked.has(role.roleId),
    );

    roles = applicable.map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      roleType: role.roleType,
    }));

    const codes = new Set<string>();
    for (const role of applicable) {
      for (const code of extractPermissionCodes(role.permissionCodes)) codes.add(code);
    }
    grantedRoleCodes = [...codes];
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

export async function buildSessionSnapshot(
  userId: number,
  currentPartnerId: number | null = null,
): Promise<SessionSnapshotInput | null> {
  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE") return null;

  const partnerUsers = (await prisma.sysPartnerUser.findMany({
    where: { userId },
    include: { partner: { select: { partnerId: true, partnerName: true, status: true } } },
  })) as PartnerUserWithPartner[];

  const activePartnerUsers = partnerUsers.filter(
    (partnerUser) =>
      partnerUser.status === "ACTIVE" && partnerUser.partner.status === "ACTIVE",
  );

  let current: CurrentContext | null = null;
  if (currentPartnerId !== null) {
    const target = activePartnerUsers.find((partnerUser) => partnerUser.partnerId === currentPartnerId);
    if (target) current = await buildCurrentContext(target);
  }

  // currentPartnerId 为空时返回 partial session：只有用户和可选 partner 列表。
  // 选中 partner 后再次构建，才会带上当前 partner、角色、权限和菜单上下文。
  return {
    userId: user.userId,
    username: user.username,
    displayName: user.nickName,
    email: user.email,
    currentPartnerId: current ? currentPartnerId : null,
    partnerName: current?.partnerName ?? null,
    contractTypes: current?.contractTypes ?? [],
    authorizingType: current?.authorizingType ?? null,
    roles: current?.roles ?? [],
    permissions: current?.permissions ?? [],
    partners: activePartnerUsers.map(toPartnerRef),
    mfaPassed: true,
  };
}
