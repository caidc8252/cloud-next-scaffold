import "server-only";

import { prisma } from "@cloud/db";
import type { Session, SessionPartyRef, SessionRole } from "@cloud/permissions/server";
import { PRESET_ROLE_ID_MAX, DB_ROLE_ID_MIN } from "@cloud/platform-config";
import { getRoles, resolvePartyScope, resolveRolePermissions } from "@/manifest";
import {
  isAuthorizingWindowOpen,
  isContractEffective,
  partnerToday,
} from "@/service/auth/server/contract-validity";
import { selectApplicableRoles } from "@/service/auth/server/role-selection";

export type SessionSnapshotInput = Omit<Session, "loginAt" | "expireAt">;

type CurrentContext = {
  partyName: string;
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

type PartyUserRow = {
  partyId: number;
  status: string;
  authorizingType: string;
  authorizingFrom: Date | null;
  authorizingTo: Date | null;
  roles: unknown;
  partner: { partyId: number; partyName: string; status: string; timezone: string };
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

function toPartyRef(partyUser: PartyUserRow): SessionPartyRef {
  return {
    partyId: partyUser.partyId,
    partyName: partyUser.partner.partyName,
    authorizingType: normalizeAuthorizingType(partyUser.authorizingType),
    status: partyUser.status,
    authorizingFrom: partyUser.authorizingFrom?.toISOString() ?? null,
    authorizingTo: partyUser.authorizingTo?.toISOString() ?? null,
  };
}

async function buildCurrentContext(
  partyUser: PartyUserRow,
  validContracts: ContractRow[],
  now: Date,
): Promise<CurrentContext> {
  const partyId = partyUser.partyId;
  const contractTypes = [...new Set(validContracts.map((contract) => contract.authorizedContractType))];
  const authorizingType = normalizeAuthorizingType(partyUser.authorizingType);

  const roleIds = extractRoleIds(partyUser.roles);
  // 角色解析分流：≤PRESET_ROLE_ID_MAX 预置空间（代码注册表，getRoles 再过滤实际命中）；≥DB_ROLE_ID_MIN 动态 PRIVATE（DB）。
  const codeRoleIds = roleIds.filter((id) => id <= PRESET_ROLE_ID_MAX);
  const dbRoleIds = roleIds.filter((id) => id >= DB_ROLE_ID_MIN);
  const codeRoles = getRoles().filter((r) => codeRoleIds.includes(r.roleId));
  const dbRoles = dbRoleIds.length
    ? await prisma.sysRole.findMany({ where: { roleId: { in: dbRoleIds } } })
    : [];

  // PRIVATE（DB）角色须属本 partner + 授权窗（start/end，按 party 时区今天）内有效；GLOBAL 代码角色全局可用、无窗。
  const today = partnerToday(partyUser.partner.timezone, now);
  const windowedDbRoles = dbRoles.filter((r) => isContractEffective(r.startDate, r.endDate, today));
  const applicableDb = selectApplicableRoles({ roles: windowedDbRoles, partyId });

  const roles: SessionRole[] = [
    ...codeRoles.map((r) => ({ roleId: r.roleId, roleName: r.roleName, roleType: "GLOBAL" })),
    ...applicableDb.map((r) => ({ roleId: r.roleId, roleName: r.roleName, roleType: r.roleType })),
  ];

  // 权限按 roleId 统一解析（authorizingType 仅展示）：每个角色取自身权限码（预置通配角色的码已由
  // getRoles 在构造期填成所在组的全部权限），再一律 ∩ party scope。无需特判通配。
  const scope = resolvePartyScope(contractTypes);
  const granted = new Set<string>();
  for (const r of codeRoles) {
    for (const code of resolveRolePermissions(r.roleId) ?? []) granted.add(code);
  }
  for (const role of applicableDb) {
    for (const code of extractPermissionCodes(role.permissionCodes)) granted.add(code);
  }
  const permissions = [...granted].filter((code) => scope.has(code));

  return {
    partyName: partyUser.partner.partyName,
    contractTypes,
    authorizingType,
    roles,
    permissions,
  };
}

export async function buildSessionSnapshot(
  userId: number,
  currentPartyId: number | null = null,
  now: Date = new Date(),
): Promise<SessionSnapshotInput | null> {
  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE") return null;

  const partyUsers = (await prisma.sysPartyUser.findMany({
    where: { userId },
    include: {
      partner: {
        select: { partyId: true, partyName: true, status: true, timezone: true },
      },
    },
  })) as PartyUserRow[];

  const activePartyUsers = partyUsers.filter(
    (partyUser) =>
      partyUser.status === "ACTIVE" && partyUser.partner.status === "ACTIVE",
  );
  const activeIds = activePartyUsers.map((partyUser) => partyUser.partyId);

  const contracts = activeIds.length
    ? ((await prisma.sysPartyContract.findMany({
        where: { authorizedPartyId: { in: activeIds }, status: "ACTIVE" },
        select: {
          authorizedPartyId: true,
          authorizedContractType: true,
          effectiveFromDate: true,
          effectiveToDate: true,
        },
      })) as (ContractRow & { authorizedPartyId: number })[])
    : [];

  const validByPartner = new Map<number, ContractRow[]>();
  for (const partyUser of activePartyUsers) {
    const today = partnerToday(partyUser.partner.timezone, now);
    validByPartner.set(
      partyUser.partyId,
      contracts.filter(
        (contract) =>
          contract.authorizedPartyId === partyUser.partyId &&
          isContractEffective(contract.effectiveFromDate, contract.effectiveToDate, today),
      ),
    );
  }

  const partners = activePartyUsers
    .filter((partyUser) => (validByPartner.get(partyUser.partyId)?.length ?? 0) > 0)
    .map(toPartyRef);

  let current: CurrentContext | null = null;
  if (currentPartyId !== null) {
    const target = activePartyUsers.find((partyUser) => partyUser.partyId === currentPartyId);
    const validContracts = target ? (validByPartner.get(currentPartyId) ?? []) : [];
    if (
      target &&
      validContracts.length > 0 &&
      isAuthorizingWindowOpen(target.authorizingFrom, target.authorizingTo, now)
    ) {
      current = await buildCurrentContext(target, validContracts, now);
    }
  }

  return {
    userId: user.userId,
    displayName: user.nickName,
    email: user.email,
    currentPartyId: current ? currentPartyId : null,
    partyName: current?.partyName ?? null,
    contractTypes: current?.contractTypes ?? [],
    authorizingType: current?.authorizingType ?? null,
    roles: current?.roles ?? [],
    permissions: current?.permissions ?? [],
    partners,
    mfaPassed: true,
  };
}
