import "server-only";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { parseAuthConfig, type AuthConfig } from "./auth.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, "../../../.env") });

// 单入口配置：字段名与 env 变量名**一字不差**（grep 一个 env 名即可定位 schema + 所有消费点）。
// 按域惰性解析 + 进程内缓存——取 REDIS_URL 不会因 AUTH_ 密钥缺失而失败。
const cacheEnvSchema = z.object({ REDIS_URL: z.string().default("redis://localhost:6379") });
const appEnvSchema = z.object({ NEXT_PUBLIC_APP_NAME: z.string().min(1) });

// app 互链基址：显式 env 优先（校验 http/https）；生产缺值硬抛；本地 dev 缺值兜底到 devFallback。
// devFallback 省略（如 merchant 未建 app）时无兜底、缺值即抛。按调用现读 env、不缓存
// （消费端测试会逐用例改写对应 env）。
export function resolveAppUrl(envKey: string, devFallback?: string): string {
  const explicit = process.env[envKey]?.trim();
  if (explicit) {
    const url = new URL(explicit);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`${envKey} must use http or https.`);
    }
    return explicit;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${envKey} must be set in production.`);
  }
  if (devFallback === undefined) {
    throw new Error(`${envKey} is not configured.`);
  }
  return devFallback;
}

export type Config = {
  /** 解码后的 RSA 私钥 DER 结构；键名对齐 env 源，值是 base64 解码结果（见 .env.example 说明）。 */
  NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY: AuthConfig["rsaPrivateKey"];
  NEXT_AUTH_AES_SECRET_KEY: string;
  REDIS_URL: string;
  NEXT_PUBLIC_APP_NAME: string;
  NEXT_PORTAL_URL: string;
  NEXT_ADMIN_URL: string;
};

let cachedAuth: AuthConfig | null = null;
let cachedCache: { REDIS_URL: string } | null = null;
let cachedApp: z.infer<typeof appEnvSchema> | null = null;
const auth = () => (cachedAuth ??= parseAuthConfig(process.env));

const config: Config = {
  get NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY() {
    return auth().rsaPrivateKey;
  },
  get NEXT_AUTH_AES_SECRET_KEY() {
    return auth().aesSecretKey;
  },
  get REDIS_URL() {
    return (cachedCache ??= cacheEnvSchema.parse(process.env)).REDIS_URL;
  },
  get NEXT_PUBLIC_APP_NAME() {
    return (cachedApp ??= appEnvSchema.parse(process.env)).NEXT_PUBLIC_APP_NAME;
  },
  get NEXT_PORTAL_URL() {
    return resolveAppUrl("NEXT_PORTAL_URL", "http://127.0.0.1:3100");
  },
  get NEXT_ADMIN_URL() {
    return resolveAppUrl("NEXT_ADMIN_URL", "http://127.0.0.1:3000");
  },
};

/** server-only 单入口：字段名 = env 变量名（.env 已在本模块顶部加载）。 */
export function getConfig(): Config {
  return config;
}

export type { AuthConfig } from "./auth.ts";
