import "server-only";

import { prisma } from "@cloud/db";
import type { Session, SessionPartnerRef, SessionRole } from "@cloud/permissions/server";
import { getMenus } from "@/manifest";
import { resolveEffectivePermissions } from "@/manifest/select";
import {
  isAuthorizingWindowOpen,
  isContractEffective,
  partnerToday,
} from "@/service/auth/server/contract-validity";
import { selectApplicableRoles } from "@/service/auth/server/role-selection";

export type SessionSnapshotInput = Omit<Session, "loginAt" | "expireAt">;

type CurrentContext = {
  partnerName: string;
  contractTypes: string[];
  authorizingType: "ADMIN" | "NORMAL";
  roles: SessionRole[];
  permissions: string[];
};

type ContractRow = {
  authorizedContractType: string;
  effectiveFromDate: Date | null;
  effectiveToDate: Date | null;
};

type PartnerUserRow = {
  partnerId: number;
  status: string;
  authorizingType: string;
  authorizingFrom: Date | null;
  authorizingTo: Date | null;
  roles: unknown;
  partner: { partnerId: number; partnerName: string; status: string; timezone: string };
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

function toPartnerRef(partnerUser: PartnerUserRow): SessionPartnerRef {
  return {
    partnerId: partnerUser.partnerId,
    partnerName: partnerUser.partner.partnerName,
    authorizingType: normalizeAuthorizingType(partnerUser.authorizingType),
    status: partnerUser.status,
    authorizingFrom: partnerUser.authorizingFrom?.toISOString() ?? null,
    authorizingTo: partnerUser.authorizingTo?.toISOString() ?? null,
  };
}

async function buildCurrentContext(
  partnerUser: PartnerUserRow,
  validContracts: ContractRow[],
): Promise<CurrentContext> {
  const partnerId = partnerUser.partnerId;
  const contractTypes = [...new Set(validContracts.map((contract) => contract.authorizedContractType))];
  const authorizingType = normalizeAuthorizingType(partnerUser.authorizingType);

  const roleIds = extractRoleIds(partnerUser.roles);
  const userRoles = roleIds.length
    ? await prisma.sysRole.findMany({ where: { roleId: { in: roleIds } } })
    : [];

  let roles: SessionRole[];
  let grantedRoleCodes: string[] = [];

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
    const blockedRoleIds = new Set(blacklist.map((item) => item.roleId));

    const applicable = selectApplicableRoles({
      roles: userRoles,
      contractTypes,
      blockedRoleIds,
      partnerId,
    });

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
  const permissions = resolveEffectivePermissions({ menus, authorizingType, grantedRoleCodes });

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
  now: Date = new Date(),
): Promise<SessionSnapshotInput | null> {
  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE") return null;

  const partnerUsers = (await prisma.sysPartnerUser.findMany({
    where: { userId },
    include: {
      partner: {
        select: { partnerId: true, partnerName: true, status: true, timezone: true },
      },
    },
  })) as PartnerUserRow[];

  const activePartnerUsers = partnerUsers.filter(
    (partnerUser) =>
      partnerUser.status === "ACTIVE" && partnerUser.partner.status === "ACTIVE",
  );
  const activeIds = activePartnerUsers.map((partnerUser) => partnerUser.partnerId);

  const contracts = activeIds.length
    ? ((await prisma.sysPartnerContract.findMany({
        where: { authorizedPartnerId: { in: activeIds }, status: "ACTIVE" },
        select: {
          authorizedPartnerId: true,
          authorizedContractType: true,
          effectiveFromDate: true,
          effectiveToDate: true,
        },
      })) as (ContractRow & { authorizedPartnerId: number })[])
    : [];

  const validByPartner = new Map<number, ContractRow[]>();
  for (const partnerUser of activePartnerUsers) {
    const today = partnerToday(partnerUser.partner.timezone, now);
    validByPartner.set(
      partnerUser.partnerId,
      contracts.filter(
        (contract) =>
          contract.authorizedPartnerId === partnerUser.partnerId &&
          isContractEffective(contract.effectiveFromDate, contract.effectiveToDate, today),
      ),
    );
  }

  const partners = activePartnerUsers
    .filter((partnerUser) => (validByPartner.get(partnerUser.partnerId)?.length ?? 0) > 0)
    .map(toPartnerRef);

  let current: CurrentContext | null = null;
  if (currentPartnerId !== null) {
    const target = activePartnerUsers.find((partnerUser) => partnerUser.partnerId === currentPartnerId);
    const validContracts = target ? (validByPartner.get(currentPartnerId) ?? []) : [];
    if (
      target &&
      validContracts.length > 0 &&
      isAuthorizingWindowOpen(target.authorizingFrom, target.authorizingTo, now)
    ) {
      current = await buildCurrentContext(target, validContracts);
    }
  }

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
    partners,
    mfaPassed: true,
  };
}
