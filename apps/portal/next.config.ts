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

// 与 apps/web 同源的 Codespaces 端口转发处理：经 VS Code 转发访问时浏览器 origin
// 与 dev server origin 不一致，会拦 RSC 导航 / dev 资源。放行转发域名 + 本地隧道。
// 仅影响开发态，不放宽生产安全。
const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  ...(codespacesForwardingDomain ? [`*.${codespacesForwardingDomain}`] : []),
];
// 注意：server action 的 CSRF 校验用 `new URL(origin).host` 取 origin，**带端口**，
// 再对 allowedOrigins 做精确串比 / 按 `.` 分段的通配匹配（见 next action-handler）。
// 经 VS Code 本地隧道访问时 origin 是 http://localhost:3100，originHost=`localhost:3100`，
// 而 x-forwarded-host 是 `*-3100.app.github.dev` → 两者不等 → 落到 allowedOrigins。
// 所以 localhost 项必须**带端口**，裸 `localhost` 匹配不上 `localhost:3100`。
// 直连公开的 `*.app.github.dev` 时 origin===x-forwarded-host，无需 allowedOrigins，靠通配兜底。
const serverActions = codespacesForwardingDomain
  ? { allowedOrigins: ["localhost:3100", "127.0.0.1:3100", `*.${codespacesForwardingDomain}`] }
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
