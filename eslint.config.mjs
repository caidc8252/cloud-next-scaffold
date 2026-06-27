import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { nextKitGuardrail } from './eslint.nextkit.mjs';

// ---- module boundary -------------------------------------------------------
// 单体 + modules 架构的硬边界：modules/<cat>/<mod> 之间不许深 import 对方内部。
// 跨模块只能走对方的服务端入口 server/<mod>.public 或客户端出口 client/<mod>.api。
// 同模块（self）与 app/ 薄壳、web/lib 不在本规则范围内（app 薄壳本就该 import controller/ui）。
const moduleKey = (p) => {
  const m = p.replace(/\\/g, "/").match(/\/modules\/([^/]+)\/([^/]+)\//);
  return m ? `${m[1]}/${m[2]}` : null;
};
const CROSS_MODULE_ALLOW = [/\/server\/[^/]+\.public$/, /\/client\/[^/]+\.api$/];
const moduleBoundaryRule = {
  meta: {
    type: "problem",
    docs: { description: "cross-module imports must target the module's *.public (server) or *.api (client) surface" },
    schema: [],
    messages: {
      deep: "跨模块禁止深 import：'{{src}}' 是另一个模块的内部。只能 import 它的 server/<mod>.public 或 client/<mod>.api。",
    },
  },
  create(context) {
    const file = context.filename ?? context.getFilename();
    const selfKey = moduleKey(file);
    if (!selfKey) return {};
    const check = (node) => {
      const src = node.source && node.source.value;
      if (typeof src !== "string") return;
      const m = src.match(/^@\/modules\/([^/]+)\/([^/]+)\/(.+)$/);
      if (!m) return;
      if (`${m[1]}/${m[2]}` === selfKey) return; // same module — intra imports unrestricted
      if (CROSS_MODULE_ALLOW.some((re) => re.test(`/${m[3]}`))) return;
      context.report({ node, messageId: "deep", data: { src } });
    };
    return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
  },
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: ["apps/*/"],
      },
    },
  },
  globalIgnores([
    ".next/**",
    "apps/*/.next/**",
    "generated/**",
    "packages/db/generated/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "apps/*/next-env.d.ts",
    ".claude/**",
    ".agents/**",
    ".playwright-mcp/**",
  ]),
  // next-kit:eslint-restricted-imports v10
  ...nextKitGuardrail({ appApi: ["apps/*/app/api/**/*.{ts,tsx,js,jsx}"] }),
  // module boundary: enforce *.public / *.api cross-module surfaces
  {
    files: ["apps/*/modules/**/*.{ts,tsx,js,jsx}"],
    plugins: { "module-boundary": { rules: { boundary: moduleBoundaryRule } } },
    rules: { "module-boundary/boundary": "error" },
  },
]);
