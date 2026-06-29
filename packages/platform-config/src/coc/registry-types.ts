// CoC 声明系统的数据形状(纯类型,无运行时 import)。
// 注:叶子菜单的展示字段(title/parentMenuCode/icon/order)由模块 manifest 携带——
// 模块拥有自己那条叶子菜单;目录(非叶子)节点在 menu-tree 骨架声明。

/** 模块声明的一条权限。label/desc 为 i18n key。 */
export interface ModulePermissionDecl {
  code: string;             // <cat>.<mod>.<fn>.<action>
  belongToMenuCode: string; // 显式;guard 强制 == 本模块 menuCode == code 前两段
  label: string;            // i18n key
  desc: string;             // i18n key
  deprecated?: boolean;
}

/** UI 模块唯一真源。无 contractTypes(合同归属在 catalog)、无 platform、无 require。 */
export interface ModuleManifest {
  moduleCategory: string;
  moduleName: string;
  menuCode: string;            // <cat>.<mod>
  title: string;              // 菜单标题 i18n key
  parentMenuCode: string;     // 挂到 menu-tree 骨架的目录 menuCode
  icon?: string;
  order?: number;
  entry: { url: string };     // 叶子页面 URL(无 category 段)
  permissions: ModulePermissionDecl[];
}

/** 目录(非叶子)骨架节点。无 contractTypes / 无 permissions / 无 path。 */
export interface MenuTreeNodeDecl {
  menuCode: string;
  title: string;              // i18n key
  parentMenuCode: string | null;
  icon?: string;
  order?: number;
}

/** 生成的权限注册表条目。 */
export interface GeneratedPermissionEntry {
  code: string;
  belongToMenuCode: string;
  label: string;
  desc: string;
  deprecated: boolean;
}

/** 生成的菜单注册表条目(叶子 + 目录拍平;无 contractTypes)。 */
export interface GeneratedMenuEntry {
  menuCode: string;
  title: string;
  parentMenuCode: string | null;
  path: string | null;        // 叶子有 path,目录为 null
  icon: string | null;
  order: number;
}

export type GuardRule =
  | "duplicate-code"
  | "deleted-without-deprecated"
  | "belongs-to-menu-rule"
  | "menu-code-required"
  | "parent-missing"
  | "catalog-ref-missing"
  | "catalog-ref-deprecated"
  | "contract-menu-missing"
  | "contract-menu-not-leaf"
  | "dead-menu";

export interface RegistryDiagnostic {
  level: "error" | "warning";
  rule: GuardRule;
  message: string;
  codes?: string[];
}

export interface RegistryResult {
  permissionRegistry: Record<string, GeneratedPermissionEntry>;
  menuRegistry: Record<string, GeneratedMenuEntry>;
  permissionCodeUnion: string[]; // 排序;含 deprecated
  menuCodeUnion: string[];       // 排序
  diagnostics: RegistryDiagnostic[];
}
