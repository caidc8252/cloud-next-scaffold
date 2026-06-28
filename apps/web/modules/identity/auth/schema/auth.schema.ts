import { z } from "zod";

// auth 域共享入参校验。登录 / MFA 二次校验 / 选择公司。

/** POST /api/auth/password —— email + RSA 密文密码。 */
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  encryptedPassword: z.string().min(1),
  // 仅 onboarding 用：认证成功后建会话并跳回此站内路径（限 /onboarding 前缀，防开放重定向）。
  returnTo: z.string().regex(/^\/onboarding(\/|\?|$)/).optional(),
});

/** 解密后 RSA 包体结构（服务端内部校验）。nonce 由 login-challenge 下发、登录时单次消费（防重放）。 */
export const loginPayloadSchema = z.object({
  password: z.string().min(1),
  timestamp: z.number().int().positive(),
  nonce: z.string().min(1),
});

/** POST /api/auth/mfa-verify —— 一次性 mfaToken + TOTP 码。 */
export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1),
  code: z.string().trim().length(6),
});

/** POST /api/auth/select-partner —— 选择登录公司。 */
export const selectPartnerSchema = z.object({
  partyId: z.number().int().positive(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;
export type SelectPartnerInput = z.infer<typeof selectPartnerSchema>;
