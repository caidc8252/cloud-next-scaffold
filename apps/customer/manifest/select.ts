import type { MenuEntry } from "@cloud/platform-config";

export type AuthorizingType = "ADMIN" | "NORMAL";

// 会话有效权限 = 角色授予的权限码 ∩ 当前契约点亮的菜单作用域。
// ADMIN 授权拿当前作用域全部权限；NORMAL 取「角色码 ∩ 作用域」。role 不参与契约过滤。
export function resolveEffectivePermissions(input: {
  menus: MenuEntry[];
  authorizingType: AuthorizingType;
  grantedRoleCodes?: string[];
}): string[] {
  const scoped = new Set<string>();
  for (const menu of input.menus) {
    for (const permission of menu.permissions ?? []) scoped.add(permission.code);
  }
  if (input.authorizingType === "ADMIN") return [...scoped];
  return (input.grantedRoleCodes ?? []).filter((code) => scoped.has(code));
}
