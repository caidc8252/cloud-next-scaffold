import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import createNextIntlPlugin from "next-intl/plugin";
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
const serverActions = codespacesForwardingDomain
  ? { allowedOrigins: ["localhost:3000", `*.${codespacesForwardingDomain}`] }
  : undefined;

const nextConfig: NextConfig = {
  transpilePackages: ["@cloud/config", "@cloud/db", "@cloud/i18n", "@cloud/request", "@cloud/security", "@cloud/ui"],
  allowedDevOrigins: ['127.0.0.1'],
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
