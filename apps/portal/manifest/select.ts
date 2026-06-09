import type { MenuEntry } from "@cloud/platform-config";

export type AuthorizingType = "ADMIN" | "NORMAL";

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
