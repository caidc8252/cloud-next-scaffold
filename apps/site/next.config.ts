import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import createNextIntlPlugin from "@cloud/i18n/plugin";
import type { NextConfig } from "next";

const appRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(appRoot, "../../.env") });

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const codespacesForwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const serverActions = codespacesForwardingDomain
  ? { allowedOrigins: ["localhost", "127.0.0.1", `*.${codespacesForwardingDomain}`] }
  : undefined;

const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  ...(codespacesForwardingDomain ? [`*.${codespacesForwardingDomain}`] : []),
];

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
    optimizePackageImports: ["@cloud/ui", "lucide-react"],
    ...(serverActions ? { serverActions } : {}),
  },
  turbopack: {
    root: join(appRoot, "../.."),
  },
};

export default withNextIntl(nextConfig);
