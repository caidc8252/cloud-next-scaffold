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
//    emit 自带的单份 i18n/en.json 跳过(下方按多 locale 自产)。此处只算 emitted,不写盘——
//    写盘要等 5. 的 i18n guard 通过后才做(严格顺序:任一 i18n error 都要拒写全部产物)。
const emitted = emitRegistry({
  result, contractScope, i18n: {}, contractTypes,
  contractTypesImport: "../catalog/contract-types.ts",
});
const outDir = join(webDir, "manifest", "_generated");

// 5. i18n:各模块 i18n + catalog i18n,按 locale 合并 → _generated/i18n/<locale>.json(coc 命名空间)。
//    合并期两道 guard:跨源同 key(C)= 冲突;派生 key 无翻译(B)= 缺失。任一 error 则拒写、退出 1。
const LOCALES = ["en", "zh-CN", "ja"];
const loadDefault = async (f) => (existsSync(f) ? (await import(pathToFileURL(f).href)).default ?? null : null);

// 把 { menu: { a: "x" }, permission: { b: "y" } } 拍平成 { "menu.a": "x", "permission.b": "y" }。
const flatten = (obj, prefix, out) => {
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, path, out);
    else out[path] = v;
  }
  return out;
};

// 所有派生 key(存在性 guard 的期望集):菜单 title + 权限 label/desc。
const derivedKeys = [
  ...Object.values(result.menuRegistry).map((m) => m.title),
  ...Object.values(result.permissionRegistry).flatMap((p) => [p.label, p.desc]),
];

const i18nErrors = [];
const nestedByLocale = {};

for (const locale of LOCALES) {
  const owner = new Map(); // flat key -> first source file that set it
  const merged = {};       // flat key -> value
  const sources = [
    ...modules.map((m) => ({ label: `modules/${m.moduleCategory}/${m.moduleName}/i18n/${locale}.ts`, file: join(webDir, "modules", m.moduleCategory, m.moduleName, "i18n", `${locale}.ts`) })),
    { label: `manifest/catalog/i18n/${locale}.ts`, file: join(webDir, "manifest", "catalog", "i18n", `${locale}.ts`) },
  ];
  for (const s of sources) {
    const data = await loadDefault(s.file);
    if (!data) continue;
    const flat = flatten(data, "", {});
    for (const [k, v] of Object.entries(flat)) {
      if (owner.has(k)) {
        // (C) 跨源同 key:冲突
        i18nErrors.push(`[i18n-duplicate-key] key "${k}" (${locale}) declared by both ${owner.get(k)} and ${s.label}; each i18n key must have a single source.`);
        continue;
      }
      owner.set(k, s.label);
      merged[k] = v;
    }
  }
  // (B) 存在性:每个派生 key 必须在本 locale 有翻译
  for (const key of derivedKeys) {
    if (!(key in merged)) {
      i18nErrors.push(`[i18n-missing-key] derived key "${key}" (${locale}) has no translation; add it to the owning module/catalog i18n/${locale}.ts.`);
    }
  }
  // 回写嵌套结构(消费端仍按 t("menu.x") 点分查找)。
  const nested = {};
  for (const [k, v] of Object.entries(merged)) {
    const parts = k.split(".");
    let cur = nested;
    for (let i = 0; i < parts.length - 1; i += 1) cur = cur[parts[i]] ??= {};
    cur[parts[parts.length - 1]] = v;
  }
  nestedByLocale[locale] = nested;
}

if (i18nErrors.length) {
  for (const e of i18nErrors) console.error(`[gen:coc] error ${e}`);
  console.error(`[gen:coc] ${i18nErrors.length} i18n error(s); refusing to write generated files.`);
  process.exit(1);
}

// 6. 至此 catalog/结构 guard(2)与 i18n guard(5)均已通过——统一写盘:先 .generated.ts,再 i18n json。
mkdirSync(outDir, { recursive: true });
let tsCount = 0;
for (const [name, content] of Object.entries(emitted)) {
  if (name.startsWith("i18n/")) continue; // 跳过 emit 的单 i18n/en.json;多 locale 用上面自产的 nestedByLocale
  const dest = join(outDir, name);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content, "utf8");
  tsCount += 1;
}

const i18nDir = join(outDir, "i18n");
mkdirSync(i18nDir, { recursive: true });
for (const locale of LOCALES) {
  writeFileSync(join(i18nDir, `${locale}.json`), JSON.stringify(nestedByLocale[locale], null, 2) + "\n", "utf8");
}

console.log(
  `[gen:coc] wrote ${tsCount} .generated.ts + ${LOCALES.length} i18n locale(s); ` +
    `${result.permissionCodeUnion.length} permission code(s), ${result.menuCodeUnion.length} menu code(s); ` +
    `${diagnostics.length - errors.length} warning(s).`,
);
