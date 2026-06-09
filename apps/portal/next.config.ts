import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// next-intl/plugin is build-config only (the i18n skill mandates importing it
// solely in next.config); there is no @cloud/i18n wrapper for the plugin.
// eslint-disable-next-line no-restricted-imports
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const appRoot = dirname(fileURLToPath(import.meta.url));

// next-intl 插件把 request config 注入 RSC / route handler 运行时上下文。
// 业务 / UI 代码仍走 @cloud/i18n 三入口，不直接 import next-intl。
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// 与 apps/web 同源的 Codespaces 端口转发处理：经 VS Code 转发访问时浏览器 origin
// 与 dev server origin 不一致，会拦 RSC 导航 / dev 资源。放行转发域名 + 本地隧道。
// 仅影响开发态，不放宽生产安全。
const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  ...(codespacesForwardingDomain ? [`*.${codespacesForwardingDomain}`] : []),
];
const serverActions = codespacesForwardingDomain
  ? { allowedOrigins: ["localhost", "127.0.0.1", `*.${codespacesForwardingDomain}`] }
  : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins,
  transpilePackages: ["@cloud/config", "@cloud/i18n", "@cloud/request", "@cloud/ui"],
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
