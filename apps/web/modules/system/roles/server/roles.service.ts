import "server-only";

import { type ActiveSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import {
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_NOT_FOUND,
  ERR_ROLE_UPDATE_BUILTIN,
} from "@cloud/request/error-codes";
import { contractTypeGroup, roleIdInGroupRange } from "@cloud/platform-config";
import { getRoles, resolvePartyScope } from "@/manifest";
import { extractRoleIds } from "@/lib/role-codes";
import type { Role } from "../schema/roles.types";
import type { CreateRoleInput, UpdateRoleInput } from "../schema/roles.schema";
import { toClientRole, toClientCodeRole } from "./roles.mapper";
import { isBuiltinRole, roleBelongsToPartner } from "./roles.policy";
import * as rolesRepository from "./roles.repository";

// 死写 GLOBAL 角色按 roleId 区间归属平台（contractType→组→区间）；与 portalUrl 路由共用 @cloud/platform-config 的单一真源。
function codeRoleIdInScope(roleId: number, contractTypes: string[]): boolean {
  return contractTypes.some((ct) => {
    const group = contractTypeGroup(ct);
    return group !== null && roleIdInGroupRange(roleId, group);
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

/**
 * 角色列表 = 该 party 平台区间内的死写编码角色（`codeRoleIdInScope` 组归属门）
 * + 该 party 的 DB PRIVATE 角色（按当前契约 scope 过滤，无一权限落在 scope 内的不返回）。
 * route GET / roles 管理页 / 用户角色选择器同口径共用。
 */
export async function listRoles(partyId: number, contractTypes: string[]): Promise<Role[]> {
  const [dbRoles, bindings] = await Promise.all([
    rolesRepository.listRoles(partyId),
    rolesRepository.listPartnerRoleBindings(partyId),
  ]);
  const counts = countOperatorsByRole(bindings);
  const updaterNames = await rolesRepository.resolveUsernames(dbRoles.map((r) => r.updUserId));
  const scope = resolvePartyScope(contractTypes);
  // 展示权限统一 ∩ scope（预置通配角色的码已由 getRoles 填成组权限；普通角色随契约缩水也可能越界）。
  const maskByScope = (perms: string[]) => perms.filter((code) => scope.has(code));

  // 编码角色：按 roleId 区间（组归属门）过滤;展示权限 = 自身权限码 ∩ scope。
  const codeRoles = getRoles()
    .filter((def) => codeRoleIdInScope(def.roleId, contractTypes))
    .map((def) => {
      const vo = toClientCodeRole(def, counts.get(def.roleId) ?? 0);
      return { ...vo, permissions: maskByScope(vo.permissions) };
    });
  // DB（PRIVATE）角色：partyId 已在 repo 过滤;展示权限 ∩ scope，并丢掉「无一权限落在当前 scope」的角色。
  const privateRoles = dbRoles
    .map((role) => {
      const vo = toClientRole(role, updaterNames.get(role.updUserId) ?? "system", counts.get(role.roleId) ?? 0);
      return { ...vo, permissions: maskByScope(vo.permissions) };
    })
    .filter((role) => role.permissions.length > 0);

  return [...codeRoles, ...privateRoles];
}

/** 用户/邀请的角色选择器；与 listRoles 同口径（编码组归属门 + DB scope 过滤）。 */
export async function listAssignableRoles(partyId: number, contractTypes: string[]): Promise<Role[]> {
  return listRoles(partyId, contractTypes);
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
  // 预置（死写 GLOBAL，≤300）角色只读：不入库，提前拦截（否则 findRole 命中空 → 误报 404）。
  if (isBuiltinRole(roleId)) throw new BusinessError(ERR_ROLE_UPDATE_BUILTIN);

  const partyId = session.currentPartyId;
  const existing = await rolesRepository.findRole(roleId);
  if (!existing || !roleBelongsToPartner(existing.partyId, partyId)) {
    throw new BusinessError(ERR_ROLE_NOT_FOUND, 404);
  }

  const updated = await rolesRepository.updateRole(roleId, {
    updUserId: session.userId,
    ...(input.name !== undefined ? { roleName: input.name.trim() } : {}),
    ...(input.description !== undefined ? { remark: input.description.trim() || null } : {}),
    ...(input.permissions !== undefined ? { permissionCodes: input.permissions } : {}),
  });

  const operatorCount = await rolesRepository.countRoleOperatorsInPartner(partyId, roleId);
  return toClientRole(updated, session.displayName ?? "", operatorCount);
}

export async function deleteRole(session: ActiveSession, roleId: number): Promise<void> {
  // 预置（死写 GLOBAL，≤300）角色不可删除：不入库，提前拦截（否则 findRole 命中空 → 误报 404）。
  if (isBuiltinRole(roleId)) throw new BusinessError(ERR_ROLE_DELETE_BUILTIN);

  const existing = await rolesRepository.findRole(roleId);
  if (!existing || !roleBelongsToPartner(existing.partyId, session.currentPartyId)) {
    throw new BusinessError(ERR_ROLE_NOT_FOUND, 404);
  }

  const assignedCount = await rolesRepository.countRoleAssignmentsAnyPartner(roleId);
  if (assignedCount > 0) throw new BusinessError(ERR_ROLE_DELETE_ASSIGNED, 409);

  await rolesRepository.deleteRole(roleId);
}
