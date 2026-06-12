import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import createNextIntlPlugin from "@cloud/i18n/plugin";
import type { NextConfig } from "next";

const appRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(appRoot, "../../.env") });

// next-intl 插件把 request config 注入 RSC / route handler 运行时上下文。
// 业务 / UI 代码仍走 @cloud/i18n 三入口，不直接 import next-intl。
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// 与 apps/admin / apps/portal 同源的 Codespaces 端口转发处理（customer 用 3200）。
// 仅影响开发态，不放宽生产安全。
const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  ...(codespacesForwardingDomain ? [`*.${codespacesForwardingDomain}`] : []),
];
const serverActions = codespacesForwardingDomain
  ? { allowedOrigins: ["localhost:3200", "127.0.0.1:3200", `*.${codespacesForwardingDomain}`] }
  : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins,
  transpilePackages: [
    "@cloud/api-kit",
    "@cloud/cache",
    "@cloud/config",
    "@cloud/db",
    "@cloud/i18n",
    "@cloud/permissions",
    "@cloud/platform-config",
    "@cloud/request",
    "@cloud/security",
    "@cloud/ui",
  ],
  experimental: {
    // 不要把 @cloud/i18n 放进 optimizePackageImports：它含 "use server"，barrel 重写会
    // 让 server action 模块身份漂移、运行时报 "Invalid Server Actions request"。
    optimizePackageImports: ["@cloud/ui", "lucide-react"],
    ...(serverActions ? { serverActions } : {}),
  },
  turbopack: {
    root: join(appRoot, "../.."),
  },
};

export default withNextIntl(nextConfig);
