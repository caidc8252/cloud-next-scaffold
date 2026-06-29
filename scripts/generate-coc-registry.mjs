// 新 CoC 生成脚本(与旧 generate-manifest-registry.mjs 并存)。读 apps/web/manifest/collect.ts →
// 调 @cloud/platform-config 2A 原语 buildRegistry/validateCatalog/deriveContractScope/emitRegistry,
// 仅产 4 个 .generated.ts 到 apps/web/manifest/_generated/(本相位不产 i18n,留 2C)。
// 有 error 诊断 → 拒写、退出码 1。产物 gitignored、由 pre 钩子重建、运行时无人消费(旧 apps.ts 仍驱动)。
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
// 直接读包源(脚本从仓库根运行,根不依赖 @cloud/*,bare specifier 解析不到);
// 只取 coc 子入口,避开旧导出。collect.ts 内的 @cloud/platform-config 由其所在 apps/web 解析,不受影响。
import {
  buildRegistry, deriveContractScope, emitRegistry, validateCatalog,
} from "../packages/platform-config/src/coc/index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "apps", "web");

// collect.ts 含可擦除 import type(指向尚未生成的 registry-types.generated.ts);
// Node 24 类型擦除后动态 import 不解析该类型,故首跑也能读。
const { collected } = await import(pathToFileURL(join(webDir, "manifest", "collect.ts")).href);
const { modules, menuTree, contractTypes, contractMenus, globalRoles } = collected;

// 1. 汇总 + 结构 guard
const result = buildRegistry({ modules, menuTree });

// 2. catalog 引用 guard
const roleCodes = [...new Set(globalRoles.flatMap((r) => r.permissionCodes))];
const contractMenuRefs = [...new Set(Object.values(contractMenus).flat())];
const catalogDiags = validateCatalog({ result, roleCodes, contractMenus: contractMenuRefs });

const diagnostics = [...result.diagnostics, ...catalogDiags];
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
//    本相位不产 i18n,跳过 i18n/* key。
const emitted = emitRegistry({
  result, contractScope, i18n: {}, contractTypes,
  contractTypesImport: "../catalog/contract-types.ts",
});
const outDir = join(webDir, "manifest", "_generated");
mkdirSync(outDir, { recursive: true });
let tsCount = 0;
for (const [name, content] of Object.entries(emitted)) {
  if (name.startsWith("i18n/")) continue; // i18n 留 2C 接管
  const dest = join(outDir, name);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content, "utf8");
  tsCount += 1;
}

console.log(
  `[gen:coc] wrote ${tsCount} .generated.ts; ` +
    `${result.permissionCodeUnion.length} permission code(s), ${result.menuCodeUnion.length} menu code(s); ` +
    `${diagnostics.length - errors.length} warning(s).`,
);
