import "server-only";

import { type ActiveSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import {
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_NOT_FOUND,
} from "@cloud/request/error-codes";
import { getRoles } from "@/manifest";
import { extractRoleIds } from "@/service/_shared/role-codes";
import type { Role } from "@/app/(portal)/system/_shared/types";
import type { CreateRoleInput, UpdateRoleInput } from "@/service/roles/schemas/roles.schema";
import { toClientRole, toClientCodeRole } from "./roles.mapper";
import { isBuiltinRole, roleBelongsToPartner } from "./roles.policy";
import * as rolesRepository from "./roles.repository";

// 死写 GLOBAL 角色按 roleId 区间归属平台：1–100 admin / 101–200 customer / 201–300 merchant。
// party 属哪个平台由其 contractTypes 推（role 与 contract 解耦后，这是「可选预置角色」的依据）。
const CONTRACT_TYPE_RANGES: Record<string, [number, number]> = {
  ADMIN: [1, 100],
  "US-ISO": [101, 200],
  "US-ISV": [101, 200],
  "US-ISO-PILOT": [101, 200],
  "US-ISV-PILOT": [101, 200],
  "PLATFORM-CUSTOM": [101, 200],
  MERCHANT: [201, 300],
};

function codeRoleIdInScope(roleId: number, contractTypes: string[]): boolean {
  return contractTypes.some((ct) => {
    const range = CONTRACT_TYPE_RANGES[ct];
    return range !== undefined && roleId >= range[0] && roleId <= range[1];
  });
}

// 角色域业务编排。接收「已解析的入参 + 当前会话」,可预期错误一律 throw BusinessError。

/** 按 partner 在册用户的角色绑定统计每个 roleId 的绑定用户数。 */
function countOperatorsByRole(bindings: { roles: unknown }[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const binding of bindings) {
    for (const roleId of extractRoleIds(binding.roles)) {
      const id = Number(roleId);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

/** 角色列表（含绑定用户数 + 更新人名）。route GET 与 roles/users 两个页面共用。 */
export async function listRoles(partyId: number): Promise<Role[]> {
  const [roles, bindings] = await Promise.all([
    rolesRepository.listRoles(partyId),
    rolesRepository.listPartnerRoleBindings(partyId),
  ]);
  const counts = countOperatorsByRole(bindings);
  const updaterNames = await rolesRepository.resolveUsernames(roles.map((role) => role.updUserId));
  return roles.map((role) =>
    toClientRole(role, updaterNames.get(role.updUserId) ?? "system", counts.get(role.roleId) ?? 0),
  );
}

/**
 * 「可分配角色」= 该 party 平台区间内的死写 GLOBAL 预置（按 contractTypes 推区间）+ 该 party 的 DB PRIVATE 角色。
 * 用户/邀请的角色选择器用它（取代旧的 `contractType==="ADMIN"` 过滤）。
 */
export async function listAssignableRoles(
  partyId: number,
  contractTypes: string[],
): Promise<Role[]> {
  const [dbRoles, bindings] = await Promise.all([
    rolesRepository.listRoles(partyId),
    rolesRepository.listPartnerRoleBindings(partyId),
  ]);
  const counts = countOperatorsByRole(bindings);
  const updaterNames = await rolesRepository.resolveUsernames(dbRoles.map((r) => r.updUserId));

  const codeRoles = getRoles()
    .filter((def) => codeRoleIdInScope(def.roleId, contractTypes))
    .map((def) => toClientCodeRole(def, counts.get(def.roleId) ?? 0));
  const privateRoles = dbRoles.map((role) =>
    toClientRole(role, updaterNames.get(role.updUserId) ?? "system", counts.get(role.roleId) ?? 0),
  );
  return [...codeRoles, ...privateRoles];
}

export async function createRole(session: ActiveSession, input: CreateRoleInput): Promise<Role> {
  const role = await rolesRepository.createRole({
    roleName: input.name,
    // 动态角色为 PRIVATE，归属当前 party（roleId 由 DB 从 1001 起自增）。
    roleType: "PRIVATE",
    partyId: session.currentPartyId,
    remark: input.description?.trim() || null,
    permissionCodes: input.permissions ?? [],
    creUserId: session.userId,
    updUserId: session.userId,
  });
  return toClientRole(role, session.displayName ?? "", 0);
}

export async function updateRole(
  session: ActiveSession,
  roleId: number,
  input: UpdateRoleInput,
): Promise<Role> {
  const partyId = session.currentPartyId;
  const existing = await rolesRepository.findRole(roleId);
  if (!existing || !roleBelongsToPartner(existing.partyId, partyId)) {
    throw new BusinessError(ERR_ROLE_NOT_FOUND, 404);
  }

  // 内置角色仅权限可改,名称 / 描述只读。
  const builtin = isBuiltinRole(existing.roleId);
  const updated = await rolesRepository.updateRole(roleId, {
    updUserId: session.userId,
    ...(!builtin && input.name !== undefined ? { roleName: input.name.trim() } : {}),
    ...(!builtin && input.description !== undefined
      ? { remark: input.description.trim() || null }
      : {}),
    ...(input.permissions !== undefined ? { permissionCodes: input.permissions } : {}),
  });

  const operatorCount = await rolesRepository.countRoleOperatorsInPartner(partyId, roleId);
  return toClientRole(updated, session.displayName ?? "", operatorCount);
}

export async function deleteRole(session: ActiveSession, roleId: number): Promise<void> {
  const existing = await rolesRepository.findRole(roleId);
  if (!existing || !roleBelongsToPartner(existing.partyId, session.currentPartyId)) {
    throw new BusinessError(ERR_ROLE_NOT_FOUND, 404);
  }
  if (isBuiltinRole(existing.roleId)) throw new BusinessError(ERR_ROLE_DELETE_BUILTIN);

  const assignedCount = await rolesRepository.countRoleAssignmentsAnyPartner(roleId);
  if (assignedCount > 0) throw new BusinessError(ERR_ROLE_DELETE_ASSIGNED, 409);

  await rolesRepository.deleteRole(roleId);
}
