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

export type Config = {
  /** 解码后的 RSA 私钥 DER 结构；键名对齐 env 源，值是 base64 解码结果（见 .env.example 说明）。 */
  AUTH_LOGIN_RSA_PRIVATE_KEY: AuthConfig["rsaPrivateKey"];
  AUTH_AES_SECRET_KEY: string;
  REDIS_URL: string;
  NEXT_PUBLIC_APP_NAME: string;
};

let cachedAuth: AuthConfig | null = null;
let cachedCache: { REDIS_URL: string } | null = null;
let cachedApp: { NEXT_PUBLIC_APP_NAME: string } | null = null;
const auth = () => (cachedAuth ??= parseAuthConfig(process.env));

const config: Config = {
  get AUTH_LOGIN_RSA_PRIVATE_KEY() {
    return auth().rsaPrivateKey;
  },
  get AUTH_AES_SECRET_KEY() {
    return auth().aesSecretKey;
  },
  get REDIS_URL() {
    return (cachedCache ??= cacheEnvSchema.parse(process.env)).REDIS_URL;
  },
  get NEXT_PUBLIC_APP_NAME() {
    return (cachedApp ??= appEnvSchema.parse(process.env)).NEXT_PUBLIC_APP_NAME;
  },
};

/** server-only 单入口：字段名 = env 变量名（.env 已在本模块顶部加载）。 */
export function getConfig(): Config {
  return config;
}

export type { AuthConfig } from "./auth.ts";
