import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const packageRoot = dirname(fileURLToPath(import.meta.url));

loadEnv({ path: resolve(packageRoot, "../..", ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --import tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
