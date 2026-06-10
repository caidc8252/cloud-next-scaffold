import "server-only";

import { prisma } from "@cloud/db";
import type { Session, SessionPartnerRef, SessionRole } from "@cloud/permissions/server";
import { getMenus } from "@/manifest";
import { resolveEffectivePermissions } from "@/manifest/select";
import {
  partnerToday,
  isContractEffective,
  isAuthorizingWindowOpen,
} from "@/service/auth/server/contract-validity";
import { selectApplicableRoles } from "@/service/auth/server/role-selection";

// 构建登录会话快照：读 DB（用户 / 公司关系 / 契约 / 角色），用 platform-config 按当前公司
// 有效契约 + 角色/ADMIN 派生有效权限码。合同有效期 / 授权窗口在此（快照时）一次性校验。
// 角色绑定走 sys_partner_user.roles JSONB（List<{roleId}>），权限码走 sys_role.permission_codes。
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

// roles JSONB 形如 [{ roleId: number }]；容错解析出 roleId 列表。
function extractRoleIds(roles: unknown): number[] {
  if (!Array.isArray(roles)) return [];
  const ids = roles
    .map((r) => (r && typeof r === "object" ? (r as { roleId?: unknown }).roleId : undefined))
    .filter((id): id is number => typeof id === "number");
  return [...new Set(ids)];
}

// permission_codes JSONB 形如 ["users.VIEW", ...]；容错解析出字符串列表。
function extractPermissionCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  return codes.filter((c): c is string => typeof c === "string");
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

// validContracts：已按 partner 当天有效过滤好的合同。
async function buildCurrentContext(
  partnerUser: PartnerUserRow,
  validContracts: ContractRow[],
): Promise<CurrentContext> {
  const partnerId = partnerUser.partnerId;
  const contractTypes = [...new Set(validContracts.map((c) => c.authorizedContractType))];
  const authorizingType = normalizeAuthorizingType(partnerUser.authorizingType);

  const roleIds = extractRoleIds(partnerUser.roles);
  const userRoles = roleIds.length
    ? await prisma.sysRole.findMany({ where: { roleId: { in: roleIds } } })
    : [];

  let roles: SessionRole[];
  let grantedRoleCodes: string[] = [];

  if (authorizingType === "ADMIN") {
    // ADMIN 无视角色取契约全量权限；角色仅用于展示
    roles = userRoles.map((role) => ({ roleId: role.roleId, roleName: role.roleName, roleType: role.roleType }));
  } else {
    const blacklist = await prisma.sysPartnerRoleBlocklist.findMany({
      where: { partnerId, contractType: { in: contractTypes } },
      select: { roleId: true },
    });
    const blockedRoleIds = new Set(blacklist.map((b) => b.roleId));

    const applicable = selectApplicableRoles({
      roles: userRoles,
      contractTypes,
      blockedRoleIds,
      partnerId,
    });

    roles = applicable.map((role) => ({ roleId: role.roleId, roleName: role.roleName, roleType: role.roleType }));

    const codes = new Set<string>();
    for (const role of applicable) {
      for (const code of extractPermissionCodes(role.permissionCodes)) codes.add(code);
    }
    grantedRoleCodes = [...codes];
  }

  const menus = getMenus(contractTypes);
  const permissions = resolveEffectivePermissions({ menus, authorizingType, grantedRoleCodes });

  return { partnerName: partnerUser.partner.partnerName, contractTypes, authorizingType, roles, permissions };
}

/**
 * 给定用户 + 目标公司，构建会话快照（不含 loginAt/expireAt，由 sessionStore 盖）。
 * - 用户无效 → null。
 * - currentPartnerId 为 null / 目标公司无效 / 无有效合同 / 授权窗口失效 → currentPartner 为 null（partial）。
 * - partners[]（可切换列表）= partner+user 均 ACTIVE 且有有效合同的可选公司。
 */
export async function buildSessionSnapshot(
  userId: number,
  currentPartnerId: number | null,
  now: Date = new Date(),
): Promise<SessionSnapshotInput | null> {
  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE") return null;

  const partnerUsers = (await prisma.sysPartnerUser.findMany({
    where: { userId },
    include: { partner: { select: { partnerId: true, partnerName: true, status: true, timezone: true } } },
  })) as PartnerUserRow[];

  const activePartnerUsers = partnerUsers.filter(
    (pu) => pu.status === "ACTIVE" && pu.partner.status === "ACTIVE",
  );
  const activeIds = activePartnerUsers.map((pu) => pu.partnerId);

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

  // 按 partner 当天有效过滤合同（partner 时区口径）
  const validByPartner = new Map<number, ContractRow[]>();
  for (const pu of activePartnerUsers) {
    const today = partnerToday(pu.partner.timezone, now);
    validByPartner.set(
      pu.partnerId,
      contracts.filter(
        (c) =>
          c.authorizedPartnerId === pu.partnerId &&
          isContractEffective(c.effectiveFromDate, c.effectiveToDate, today),
      ),
    );
  }

  // 可选公司：partner/user 已 ACTIVE，再要求有有效合同
  const partners: SessionPartnerRef[] = activePartnerUsers
    .filter((pu) => (validByPartner.get(pu.partnerId)?.length ?? 0) > 0)
    .map(toPartnerRef);

  let current: CurrentContext | null = null;
  if (currentPartnerId !== null) {
    const target = activePartnerUsers.find((pu) => pu.partnerId === currentPartnerId);
    const valid = target ? validByPartner.get(currentPartnerId) ?? [] : [];
    if (target && valid.length > 0 && isAuthorizingWindowOpen(target.authorizingFrom, target.authorizingTo, now)) {
      current = await buildCurrentContext(target, valid);
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
