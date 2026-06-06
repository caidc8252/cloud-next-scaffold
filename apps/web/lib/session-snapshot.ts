import "server-only";

import { prisma } from "@cloud/db";
import type { Session, SessionPartnerRef, SessionRole } from "@cloud/permissions/server";
import { getMenus } from "@/manifest";
import { resolveEffectivePermissions } from "@/manifest/select";

// 构建登录会话快照：读 DB（用户 / 公司关系 / 契约 / 角色），用 platform-config 按
// 当前公司契约 + 角色/ADMIN 派生有效权限码。permissions 包不碰 manifest，派生在这里。
// 角色绑定走 sys_partner_user.roles JSONB（List<{roleId}>），权限码走 sys_role.permission_codes
// JSONB（List<string>），不再有 sys_user_role / sys_role_permission join 表。
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
  roles: unknown;
  partner: { partnerId: number; partnerName: string; status: string };
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
  const contractTypes = [...new Set(contracts.map((c) => c.authorizedContractType))];

  const authorizingType = normalizeAuthorizingType(partnerUser.authorizingType);

  const roleIds = extractRoleIds(partnerUser.roles);
  const userRoles = roleIds.length
    ? await prisma.sysRole.findMany({
        where: { roleId: { in: roleIds } },
      })
    : [];

  let roles: SessionRole[];
  let grantedRoleCodes: string[] = [];

  if (authorizingType === "ADMIN") {
    // ADMIN 无视角色取契约全量权限；角色仅用于展示
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
    const blocked = new Set(blacklist.map((b) => b.roleId));

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
  if (!user || user.status !== "ACTIVE") return null;

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
    if (target) current = await buildCurrentContext(target);
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
