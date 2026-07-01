// 唯一 CoC 生成脚本。读 apps/web/manifest/collect.ts → 调 @cloud/platform-config CoC 原语
// buildRegistry/validateCatalog/validateGlobalRoles/deriveContractScope/emitRegistry,
// 产 4 个 .generated.ts + 多 locale i18n 到 apps/web/manifest/_generated/。
// 有 error 诊断 → 拒写、退出码 1。产物 gitignored、由 pre 钩子重建、不手改。
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// 直接读包源(脚本从仓库根运行,根不依赖 @cloud/*,bare specifier 解析不到);
// 只取 coc 子入口,避开旧导出。collect.ts 内的 @cloud/platform-config 由其所在 apps/web 解析,不受影响。
import {
  buildRegistry, deriveContractScope, emitRegistry, validateCatalog, validateGlobalRoles,
} from "../packages/platform-config/src/coc/index.ts";
import { PRESET_ROLE_ID_ALLOCATION_MAX } from "../packages/platform-config/src/contract-group.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "apps", "web");

// collect.ts 含可擦除 import type(指向尚未生成的 registry-types.generated.ts);
// Node 24 类型擦除后动态 import 不解析该类型,故首跑也能读。
const { collected } = await import(pathToFileURL(join(webDir, "manifest", "collect.ts")).href);
const { modules, menuTree, contractTypes, contractMenus, globalRoles } = collected;

// 1. 汇总 + 结构 guard(仅真实 modules;跨模块前向声明改由 *.stub.ts 承载,gen:coc 不再感知 stub)
const result = buildRegistry({ modules, menuTree });

// 2. catalog 引用 guard
const roleCodes = [...new Set(globalRoles.flatMap((r) => r.permissionCodes))];
const contractMenuRefs = [...new Set(Object.values(contractMenus).flat())];
const catalogDiags = validateCatalog({ result, roleCodes, contractMenus: contractMenuRefs });

// 2b. 预置 GLOBAL 角色 guard:roleId 必须在 [1, PRESET_ROLE_ID_ALLOCATION_MAX] 区间内且唯一。
const roleDiags = validateGlobalRoles({ globalRoles, minId: 1, maxId: PRESET_ROLE_ID_ALLOCATION_MAX });

const diagnostics = [...result.diagnostics, ...catalogDiags, ...roleDiags];
for (const d of diagnostics) {
  const line = `[gen:coc] ${d.level} ${d.rule}: ${d.message}`;
  if (d.level === "error") console.error(line);
  else console.warn(line);
}
const errors = diagnostics.filter((d) => d.level === "error");
if (errors.length) {
  console.error(`[gen:coc] ${errors.length} error diagnostic(s); refusing to write generated files.`);
  process.exit(1);
}

// 3. 反推 contract scope
const contractScope = deriveContractScope(contractMenus, result);

// 4. emit:catalog 在 manifest/catalog/、产物在 manifest/_generated/ → 传 ../catalog/contract-types.ts。
//    emit 自带的单份 i18n/en.json 跳过(下方按多 locale 自产)。
const emitted = emitRegistry({
  result, contractScope, i18n: {}, contractTypes,
  contractTypesImport: "../catalog/contract-types.ts",
});
const outDir = join(webDir, "manifest", "_generated");
mkdirSync(outDir, { recursive: true });
let tsCount = 0;
for (const [name, content] of Object.entries(emitted)) {
  if (name.startsWith("i18n/")) continue; // 跳过 emit 的单 i18n/en.json;多 locale 在下方自产
  const dest = join(outDir, name);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content, "utf8");
  tsCount += 1;
}

// 5. i18n:各模块 i18n + catalog i18n,按 locale 深合并 → _generated/i18n/<locale>.json(coc 命名空间)。
//    接管旧 gen:manifest 的 i18n 产出;不含 menu.home/dashboard(B 类已移 app nav 命名空间)。
const LOCALES = ["en", "zh-CN", "ja"];
const mergeInto = (t, s) => {
  for (const k of Object.keys(s)) {
    if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) t[k] = mergeInto(t[k] ?? {}, s[k]);
    else t[k] = s[k];
  }
  return t;
};
const loadDefault = async (f) => (existsSync(f) ? (await import(pathToFileURL(f).href)).default ?? null : null);

const i18nDir = join(outDir, "i18n");
mkdirSync(i18nDir, { recursive: true });
for (const locale of LOCALES) {
  const merged = {};
  for (const m of modules) {
    const data = await loadDefault(join(webDir, "modules", m.moduleCategory, m.moduleName, "i18n", `${locale}.ts`));
    if (data) mergeInto(merged, data);
  }
  const cat = await loadDefault(join(webDir, "manifest", "catalog", "i18n", `${locale}.ts`));
  if (cat) mergeInto(merged, cat);
  writeFileSync(join(i18nDir, `${locale}.json`), JSON.stringify(merged, null, 2) + "\n", "utf8");
}

console.log(
  `[gen:coc] wrote ${tsCount} .generated.ts + ${LOCALES.length} i18n locale(s); ` +
    `${result.permissionCodeUnion.length} permission code(s), ${result.menuCodeUnion.length} menu code(s); ` +
    `${diagnostics.length - errors.length} warning(s).`,
);
