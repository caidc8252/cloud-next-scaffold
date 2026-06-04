import "server-only";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { parseAuthConfig, type AuthConfig } from "./auth.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, "../../../.env") });

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}

let cachedAuthConfig: AuthConfig | null = null;

/** server-only：读 process.env（.env 已在本模块顶部加载）解析 auth 配置，进程内缓存。 */
export function getAuthConfig(): AuthConfig {
  if (!cachedAuthConfig) {
    cachedAuthConfig = parseAuthConfig(process.env);
  }
  return cachedAuthConfig;
}

export type { AuthConfig } from "./auth.ts";
