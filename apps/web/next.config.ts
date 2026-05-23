import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

const appRoot = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(appRoot, "../../.env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@cloud/config", "@cloud/db", "@cloud/request", "@cloud/security", "@cloud/ui"],
  experimental: {
    optimizePackageImports: ["@cloud/ui", "lucide-react"],
  },
  turbopack: {
    root: join(appRoot, "../.."),
  },
};

export default nextConfig;
