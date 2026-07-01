import type {
  GeneratedMenuEntry, GeneratedPermissionEntry, MenuTreeNodeDecl,
  ModuleManifest, RegistryDiagnostic, RegistryResult,
} from "./registry-types.ts";
import { deriveMenuTitleKey, derivePermLabelKey, derivePermDescKey } from "./derive-i18n-keys.ts";

const menuPrefixOf = (code: string): string => code.split(".").slice(0, 2).join(".");

// registry = 当前声明快照的纯投影。无 previous / 无 reconcile / 无 deprecated。
// title / label / desc 不再由作者携带,而是按 code 派生(见 derive-i18n-keys)。
export function buildRegistry(input: {
  modules: readonly ModuleManifest[];
  menuTree: readonly MenuTreeNodeDecl[];
}): RegistryResult {
  const { modules, menuTree } = input;
  const diagnostics: RegistryDiagnostic[] = [];

  // ---- 采集期唯一性:menuCode 跨骨架 + 模块不得重复(否则对象赋值静默覆盖) ----
  const menuDeclarers = new Map<string, string[]>();
  for (const n of menuTree) menuDeclarers.set(n.menuCode, [...(menuDeclarers.get(n.menuCode) ?? []), "menu-tree"]);
  for (const m of modules) menuDeclarers.set(m.menuCode, [...(menuDeclarers.get(m.menuCode) ?? []), `module ${m.moduleCategory}/${m.moduleName}`]);
  for (const [code, sources] of menuDeclarers) {
    if (sources.length > 1) {
      diagnostics.push({ level: "error", rule: "duplicate-menu-code", message: `menuCode "${code}" declared ${sources.length}×, by ${sources.join(" and ")}; each menuCode must be unique (later declarations silently overwrite the menu registry).`, codes: [code] });
    }
  }

  // ---- 采集期派生前置:任何 menuCode / permission code 含 "_" 会破坏 "."→"_" 单射 ----
  const flagUnderscore = (kind: string, code: string, where: string): void => {
    if (code.includes("_")) {
      diagnostics.push({ level: "error", rule: "code-underscore", message: `${kind} "${code}" (${where}) contains "_", which collides under the "."→"_" i18n-key derivation; use camelCase segments instead.`, codes: [code] });
    }
  };
  for (const n of menuTree) flagUnderscore("menuCode", n.menuCode, "menu-tree");
  for (const m of modules) {
    flagUnderscore("menuCode", m.menuCode, `module ${m.moduleCategory}/${m.moduleName}`);
    for (const p of m.permissions) flagUnderscore("permission code", p.code, `module ${m.moduleCategory}/${m.moduleName}`);
  }

  // ---- 菜单注册表:目录(来自骨架)+ 叶子(来自模块);title 派生 ----
  const menuRegistry: Record<string, GeneratedMenuEntry> = {};
  for (const n of menuTree) {
    menuRegistry[n.menuCode] = {
      menuCode: n.menuCode, title: deriveMenuTitleKey(n.menuCode), parentMenuCode: n.parentMenuCode,
      path: null, icon: n.icon ?? null, order: n.order ?? 0,
    };
  }
  for (const m of modules) {
    menuRegistry[m.menuCode] = {
      menuCode: m.menuCode, title: deriveMenuTitleKey(m.menuCode), parentMenuCode: m.parentMenuCode,
      path: m.entry.url, icon: m.icon ?? null, order: m.order ?? 0,
    };
  }
  const menuCodes = new Set(Object.keys(menuRegistry));

  // ---- 结构 guard:parent 存在 ----
  for (const code of menuCodes) {
    const parent = menuRegistry[code]!.parentMenuCode;
    if (parent !== null && !menuCodes.has(parent)) {
      diagnostics.push({ level: "error", rule: "parent-missing", message: `menu "${code}" references missing parent "${parent}".`, codes: [code] });
    }
  }

  // ---- 骨架深度 guard:骨架(目录)节点最多两层 ----
  const skeletonCodes = new Set(menuTree.map((n) => n.menuCode));
  for (const n of menuTree) {
    let depth = 1;
    let cur: string | null = n.parentMenuCode;
    const seen = new Set<string>([n.menuCode]);
    while (cur && menuRegistry[cur] && !seen.has(cur)) {
      depth += 1;
      seen.add(cur);
      cur = menuRegistry[cur]!.parentMenuCode;
    }
    if (depth > 2 && skeletonCodes.has(n.menuCode)) {
      diagnostics.push({ level: "error", rule: "menu-depth", message: `skeleton menu "${n.menuCode}" sits at depth ${depth}; the directory skeleton is capped at 2 levels (a skeleton node's parent must be a root).`, codes: [n.menuCode] });
    }
  }

  // ---- 权限注册表 + guard:belongToMenuCode 规则 + 重名(带来源) ----
  const permDeclarers = new Map<string, string[]>();
  const permissionRegistry: Record<string, GeneratedPermissionEntry> = {};
  for (const m of modules) {
    for (const p of m.permissions) {
      permDeclarers.set(p.code, [...(permDeclarers.get(p.code) ?? []), `${m.moduleCategory}/${m.moduleName}`]);
      if (p.belongToMenuCode !== m.menuCode || p.belongToMenuCode !== menuPrefixOf(p.code)) {
        diagnostics.push({ level: "error", rule: "belongs-to-menu-rule", message: `permission "${p.code}": belongToMenuCode "${p.belongToMenuCode}" must equal module menuCode "${m.menuCode}" and code prefix "${menuPrefixOf(p.code)}".`, codes: [p.code] });
      }
      permissionRegistry[p.code] = {
        code: p.code, belongToMenuCode: p.belongToMenuCode,
        label: derivePermLabelKey(p.code), desc: derivePermDescKey(p.code),
      };
    }
  }
  for (const [code, sources] of permDeclarers) {
    if (sources.length > 1) {
      diagnostics.push({ level: "error", rule: "duplicate-code", message: `permission_code "${code}" declared ${sources.length}×, by modules ${sources.join(", ")}; permission codes are add-only and must be globally unique.`, codes: [code] });
    }
  }

  const permissionCodeUnion = Object.keys(permissionRegistry).sort();
  const menuCodeUnion = Object.keys(menuRegistry).sort();
  return { permissionRegistry, menuRegistry, permissionCodeUnion, menuCodeUnion, diagnostics };
}
