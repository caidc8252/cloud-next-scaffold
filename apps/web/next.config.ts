import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import createNextIntlPlugin from "@cloud/i18n/plugin";
import type { NextConfig } from "next";

const appRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(appRoot, "../../.env") });

// next-intl 插件把 request config 注入到 RSC/route handler 的运行时上下文。
// 业务/UI 代码仍走 @cloud/i18n 三入口，不直接 import next-intl。
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// GitHub Codespaces 下所有 server action 都会报 E80 "Invalid Server Actions request."
// （切语言 / TimeZoneInit 等）。根因：经 VS Code 本地端口转发访问时，浏览器 origin 是
// localhost:3000，但 GitHub 转发层注入了 x-forwarded-host: <name>.app.github.dev；
// Next 的 CSRF 校验优先信任转发头，拿它和 origin 比 → 不一致 → 拒绝。
// 把两种访问方式的 origin（localhost 隧道 + 直连 *.app.github.dev）都放行即可。
// 仅在 Codespaces 下生效，普通本地 / 生产部署不受影响。
const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
// server action 的 CSRF 校验用 `new URL(origin).host` 取 origin（**带端口**），再对
// allowedOrigins 精确串比 / 按 `.` 分段通配匹配。经 VS Code 本地隧道访问时 origin 是
// localhost:3000，与 x-forwarded-host(`*-3000.app.github.dev`) 不等 → 落 allowedOrigins，
// 所以 localhost 项必须**带端口**，裸 `localhost` 匹配不上 `localhost:3000`。
const serverActions = codespacesForwardingDomain
  ? { allowedOrigins: ["localhost:3000", "127.0.0.1:3000", `*.${codespacesForwardingDomain}`] }
  : undefined;

// Next 16 dev 默认拦截「非同源」对 /_next/* 等 dev 资源的请求（含 RSC 导航 payload）。
// 经 Codespaces 转发域名 / 127.0.0.1 隧道访问时，浏览器源与 dev server 源不一致 →
// 登录后 router.replace 的 RSC 导航被挡，表现为页面卡住 / 反复跳回登录。
// 放行转发域名 + 本地隧道两种 host（仅影响 dev，本地直连 / 生产不受影响）。
const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  ...(codespacesForwardingDomain ? [`*.${codespacesForwardingDomain}`] : []),
];

const nextConfig: NextConfig = {
  // dev 下 Codespaces 端口转发会让 localhost / 127.0.0.1 混用，放行两者的 dev 资源，
  // 避免 HMR 等被 cross-origin 拦截。仅影响开发态资源加载，不放宽生产安全。
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
    // 不要把 @cloud/i18n 放进来：它含 "use server"（setLocaleAction / setTimeZoneAction），
    // optimizePackageImports 重写 barrel 导入会让 server action 模块身份漂移、ID 对不上，
    // 运行时报 "Invalid Server Actions request"。它在 transpilePackages 里即可。
    optimizePackageImports: ["@cloud/ui", "lucide-react"],
    ...(serverActions ? { serverActions } : {}),
  },
  turbopack: {
    root: join(appRoot, "../.."),
  },
};

export default withNextIntl(nextConfig);
