import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "apps/*/next-env.d.ts",
    ".claude/**",
    ".agents/**",
    ".playwright-mcp/**",
  ]),
]);
