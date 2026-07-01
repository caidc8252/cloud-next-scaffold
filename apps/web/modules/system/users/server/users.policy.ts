import "server-only";

import { hasPermissions } from "@cloud/permissions/server";
import { normalizeRoleIds } from "@/lib/role-codes";

// 用户域的范围 / 实体保护规则（纯函数，便于单测）。粗粒度的 users.* 码校验仍在 route 用
// assertPermissions 做；这里是「已具备粗粒度权限后，对具体目标用户的二层校验」。

/** 目标就是会话本人。锁定/禁用本人有独立语义（错误码与「受保护」不同），单独判定。 */
export function isSelf(targetUserId: number, sessionUserId: number): boolean {
  return targetUserId === sessionUserId;
}

/** 受保护用户：会话本人，或 ADMIN 归属。禁止改角色 / 锁定 / 重置密码。 */
export function isProtectedUser(
  targetUserId: number,
  sessionUserId: number,
  authorizingType: string,
): boolean {
  return isSelf(targetUserId, sessionUserId) || authorizingType === "ADMIN";
}

/** 请求的角色集合相对当前是否有实质变更（去重升序后逐项比较，忽略顺序与重复）。 */
export function rolesChanged(currentRoleIds: number[], requestedRoleIds: number[]): boolean {
  const current = normalizeRoleIds(currentRoleIds);
  const requested = normalizeRoleIds(requestedRoleIds);
  return (
    current.length !== requested.length ||
    current.some((roleId, index) => roleId !== requested[index])
  );
}

/** 改角色需要 users.changeRole（在已具备 users.update 的基础上的范围校验）。 */
export function canChangeRoles(permissions: readonly string[]): boolean {
  return hasPermissions(permissions, { all: ["system.users.user.changeRole"] });
}
