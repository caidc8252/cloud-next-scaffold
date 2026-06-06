import { z } from "zod";

// 默认值需与 password-policy.ts 的 PASSWORD_POLICY 展示值保持一致
const authConfigSchema = z.object({
  AUTH_PASSWORD_MAX_ERROR_TIMES: z.coerce.number().int().positive().default(6),
  AUTH_PASSWORD_LOCK_MINUTES: z.coerce.number().int().positive().default(30),
  AUTH_LOGIN_TIMESTAMP_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  AUTH_LOGIN_RSA_PRIVATE_KEY: z.string().min(1),
});

export type AuthConfig = {
  maxPasswordErrorTimes: number;
  lockDurationMinutes: number;
  timestampWindowMs: number;
  rsaPrivateKeyPem: string;
};

/** 纯函数：从环境变量解析 auth 运行期配置。密钥/阈值由 env 提供，便于单测注入。 */
export function parseAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const parsed = authConfigSchema.parse(env);
  return {
    maxPasswordErrorTimes: parsed.AUTH_PASSWORD_MAX_ERROR_TIMES,
    lockDurationMinutes: parsed.AUTH_PASSWORD_LOCK_MINUTES,
    timestampWindowMs: parsed.AUTH_LOGIN_TIMESTAMP_WINDOW_SECONDS * 1000,
    rsaPrivateKeyPem: parsed.AUTH_LOGIN_RSA_PRIVATE_KEY,
  };
}
