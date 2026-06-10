import "server-only";

import { type ActiveSession } from "@cloud/permissions/server";
import { BusinessError } from "@cloud/request";
import {
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_NOT_FOUND,
} from "@cloud/request/error-codes";
import { extractRoleIds } from "@/service/_shared/role-codes";
import type { Role } from "@/app/(portal)/system/_shared/types";
import type { CreateRoleInput, UpdateRoleInput } from "@/service/roles/schemas/roles.schema";
import { toClientRole } from "./roles.mapper";
import { isBuiltinRole, roleBelongsToPartner } from "./roles.policy";
import * as rolesRepository from "./roles.repository";

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
export async function listRoles(partnerId: number): Promise<Role[]> {
  const [roles, bindings] = await Promise.all([
    rolesRepository.listRoles(partnerId),
    rolesRepository.listPartnerRoleBindings(partnerId),
  ]);
  const counts = countOperatorsByRole(bindings);
  const updaterNames = await rolesRepository.resolveUsernames(roles.map((role) => role.updUserId));
  return roles.map((role) =>
    toClientRole(role, updaterNames.get(role.updUserId) ?? "system", counts.get(role.roleId) ?? 0),
  );
}

export async function createRole(session: ActiveSession, input: CreateRoleInput): Promise<Role> {
  const role = await rolesRepository.createRole({
    roleName: input.name,
    roleType: "GLOBAL",
    contractType: "ADMIN",
    partnerId: session.currentPartnerId,
    remark: input.description?.trim() || null,
    permissionCodes: input.permissions ?? [],
    creUserId: session.userId,
    updUserId: session.userId,
  });
  return toClientRole(role, session.username, 0);
}

export async function updateRole(
  session: ActiveSession,
  roleId: number,
  input: UpdateRoleInput,
): Promise<Role> {
  const partnerId = session.currentPartnerId;
  const existing = await rolesRepository.findRole(roleId);
  if (!existing || !roleBelongsToPartner(existing.partnerId, partnerId)) {
    throw new BusinessError(ERR_ROLE_NOT_FOUND, 404);
  }

  // 内置角色仅权限可改,名称 / 描述只读。
  const builtin = isBuiltinRole(existing.roleType);
  const updated = await rolesRepository.updateRole(roleId, {
    updUserId: session.userId,
    ...(!builtin && input.name !== undefined ? { roleName: input.name.trim() } : {}),
    ...(!builtin && input.description !== undefined
      ? { remark: input.description.trim() || null }
      : {}),
    ...(input.permissions !== undefined ? { permissionCodes: input.permissions } : {}),
  });

  const operatorCount = await rolesRepository.countRoleOperatorsInPartner(partnerId, roleId);
  return toClientRole(updated, session.username, operatorCount);
}

export async function deleteRole(session: ActiveSession, roleId: number): Promise<void> {
  const existing = await rolesRepository.findRole(roleId);
  if (!existing || !roleBelongsToPartner(existing.partnerId, session.currentPartnerId)) {
    throw new BusinessError(ERR_ROLE_NOT_FOUND, 404);
  }
  if (isBuiltinRole(existing.roleType)) throw new BusinessError(ERR_ROLE_DELETE_BUILTIN);

  const assignedCount = await rolesRepository.countRoleAssignmentsAnyPartner(roleId);
  if (assignedCount > 0) throw new BusinessError(ERR_ROLE_DELETE_ASSIGNED, 409);

  await rolesRepository.deleteRole(roleId);
}
