// 权限目录(角色编辑器用):按菜单分组、按 party scope 过滤。读 CoC 生成注册表。
// 纯应用业务(不进 @cloud/platform-config)。新模型无 require 链式联动(设计 §3):权限项无依赖关系。
import { PERMISSION_REGISTRY } from "./_generated/permission-registry.generated.ts";
import { MENU_REGISTRY } from "./_generated/menu-registry.generated.ts";
import { resolvePartyScope } from "./index.ts";
import type { PermissionGroup } from "@/lib/permission-catalog";

/** 按菜单分组的权限目录(角色编辑器 / ADMIN 展开用),只含 party scope 内的码。 */
export function selectPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  const scope = resolvePartyScope(contractTypes);
  const byMenu = new Map<string, PermissionGroup>();
  const orderOf = new Map<string, number>();
  for (const e of Object.values(PERMISSION_REGISTRY)) {
    if (!scope.has(e.code)) continue;
    let group = byMenu.get(e.belongToMenuCode);
    if (!group) {
      const menu = MENU_REGISTRY[e.belongToMenuCode];
      group = { menuCode: e.belongToMenuCode, title: menu?.title ?? e.belongToMenuCode, items: [] };
      orderOf.set(e.belongToMenuCode, menu?.order ?? 0);
      byMenu.set(e.belongToMenuCode, group);
    }
    group.items.push({ code: e.code, label: e.label, desc: e.desc });
  }
  return [...byMenu.values()]
    .sort((a, b) => (orderOf.get(a.menuCode) ?? 0) - (orderOf.get(b.menuCode) ?? 0))
    .map((group) => ({ ...group, items: group.items.sort((x, y) => x.code.localeCompare(y.code)) }));
}
