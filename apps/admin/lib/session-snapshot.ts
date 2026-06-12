import "server-only";

import { prisma } from "@cloud/db";
import type { Session, SessionPartyRef, SessionRole } from "@cloud/permissions/server";
import { getMenus, getRoles, resolveRolePermissions } from "@/manifest";
import { resolveEffectivePermissions } from "@/manifest/select";
import {
  partnerToday,
  isContractEffective,
  isAuthorizingWindowOpen,
} from "@/service/auth/server/contract-validity";
import { selectApplicableRoles } from "@/service/auth/server/role-selection";

// 构建登录会话快照：读 DB（用户 / 公司关系 / 契约 / 角色），用 platform-config 按当前公司
// 有效契约 + 角色/ADMIN 派生有效权限码。合同有效期 / 授权窗口在此（快照时）一次性校验。
// 角色绑定走 sys_party_user.roles JSONB（List<{roleId}>），权限码走 sys_role.permission_codes。
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

// validContracts：已按 partner 当天有效过滤好的合同。
async function buildCurrentContext(
  partyUser: PartyUserRow,
  validContracts: ContractRow[],
  now: Date,
): Promise<CurrentContext> {
  const partyId = partyUser.partyId;
  const contractTypes = [...new Set(validContracts.map((c) => c.authorizedContractType))];
  const authorizingType = normalizeAuthorizingType(partyUser.authorizingType);

  const roleIds = extractRoleIds(partyUser.roles);
  // 角色解析分流：≤300 死写 GLOBAL（代码注册表）；≥1001 动态 PRIVATE（DB）。
  const codeRoleIds = roleIds.filter((id) => id <= 300);
  const dbRoleIds = roleIds.filter((id) => id >= 1001);
  const codeRoles = getRoles().filter((r) => codeRoleIds.includes(r.roleId));
  const dbRoles = dbRoleIds.length
    ? await prisma.sysRole.findMany({ where: { roleId: { in: dbRoleIds } } })
    : [];

  let roles: SessionRole[];
  let grantedRoleCodes: string[] = [];

  if (authorizingType === "ADMIN") {
    // ADMIN 无视角色取契约全量权限；角色仅用于展示。代码角色 roleType 视为 GLOBAL。
    roles = [
      ...codeRoles.map((r) => ({ roleId: r.roleId, roleName: r.roleName, roleType: "GLOBAL" })),
      ...dbRoles.map((r) => ({ roleId: r.roleId, roleName: r.roleName, roleType: r.roleType })),
    ];
  } else {
    // PRIVATE（DB）角色须属本 partner + 授权窗（start/end，按 party 时区今天）内有效；GLOBAL 代码角色全局可用、无窗。
    const today = partnerToday(partyUser.partner.timezone, now);
    const windowedDbRoles = dbRoles.filter((r) => isContractEffective(r.startDate, r.endDate, today));
    const applicableDb = selectApplicableRoles({ roles: windowedDbRoles, partyId });

    roles = [
      ...codeRoles.map((r) => ({ roleId: r.roleId, roleName: r.roleName, roleType: "GLOBAL" })),
      ...applicableDb.map((r) => ({ roleId: r.roleId, roleName: r.roleName, roleType: r.roleType })),
    ];

    const codes = new Set<string>();
    for (const r of codeRoles) {
      for (const code of resolveRolePermissions(r.roleId) ?? []) codes.add(code);
    }
    for (const role of applicableDb) {
      for (const code of extractPermissionCodes(role.permissionCodes)) codes.add(code);
    }
    grantedRoleCodes = [...codes];
  }

  const menus = getMenus(contractTypes);
  const permissions = resolveEffectivePermissions({ menus, authorizingType, grantedRoleCodes });

  return { partyName: partyUser.partner.partyName, contractTypes, authorizingType, roles, permissions };
}

/**
 * 给定用户 + 目标公司，构建会话快照（不含 loginAt/expireAt，由 sessionStore 盖）。
 * - 用户无效 → null。
 * - currentPartyId 为 null / 目标公司无效 / 无有效合同 / 授权窗口失效 → currentPartner 为 null（partial）。
 * - partners[]（可切换列表）= partner+user 均 ACTIVE 且有有效合同的可选公司。
 */
export async function buildSessionSnapshot(
  userId: number,
  currentPartyId: number | null,
  now: Date = new Date(),
): Promise<SessionSnapshotInput | null> {
  const user = await prisma.sysUser.findUnique({ where: { userId } });
  if (!user || user.status !== "ACTIVE") return null;

  const partyUsers = (await prisma.sysPartyUser.findMany({
    where: { userId },
    include: { partner: { select: { partyId: true, partyName: true, status: true, timezone: true } } },
  })) as PartyUserRow[];

  const activePartyUsers = partyUsers.filter(
    (pu) => pu.status === "ACTIVE" && pu.partner.status === "ACTIVE",
  );
  const activeIds = activePartyUsers.map((pu) => pu.partyId);

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

  // 按 partner 当天有效过滤合同（partner 时区口径）
  const validByPartner = new Map<number, ContractRow[]>();
  for (const pu of activePartyUsers) {
    const today = partnerToday(pu.partner.timezone, now);
    validByPartner.set(
      pu.partyId,
      contracts.filter(
        (c) =>
          c.authorizedPartyId === pu.partyId &&
          isContractEffective(c.effectiveFromDate, c.effectiveToDate, today),
      ),
    );
  }

  // 可选公司：partner/user 已 ACTIVE，再要求有有效合同
  const partners: SessionPartyRef[] = activePartyUsers
    .filter((pu) => (validByPartner.get(pu.partyId)?.length ?? 0) > 0)
    .map(toPartyRef);

  let current: CurrentContext | null = null;
  if (currentPartyId !== null) {
    const target = activePartyUsers.find((pu) => pu.partyId === currentPartyId);
    const valid = target ? validByPartner.get(currentPartyId) ?? [] : [];
    if (target && valid.length > 0 && isAuthorizingWindowOpen(target.authorizingFrom, target.authorizingTo, now)) {
      current = await buildCurrentContext(target, valid, now);
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
