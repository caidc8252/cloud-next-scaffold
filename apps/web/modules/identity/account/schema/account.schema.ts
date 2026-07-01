import { z } from "zod";

// account 域共享入参校验。client 表单与 route 共用;route 负责把解析失败映射成稳定 error code。

/** PATCH /api/account/profile —— 昵称 / 国家（都可选，至少给一项由 UI 约束）。 */
export const updateProfileSchema = z
  .object({
    nickName: z.string().trim().min(1).max(100),
    country: z.string().trim().length(2).nullable(),
  })
  .partial();


/** PATCH /api/account/email —— 改邮箱（需旧邮箱 + 新邮箱双验证码）。 */
export const changeEmailSchema = z.object({
  newEmail: z.email(),
  currentCode: z.string().trim().length(6),
  newCode: z.string().trim().length(6),
});

/** POST /api/account/password —— 改密码（密文 + 可选 step-up TOTP）。 */
export const changePasswordSchema = z.object({
  encryptedCurrentPassword: z.string().min(1),
  encryptedNewPassword: z.string().min(1),
  mfaCode: z.string().trim().length(6).optional(),
});

/** 解密后 RSA 包体的结构（服务端内部校验，非客户端入参）。 */
export const passwordPayloadSchema = z.object({
  password: z.string().min(1),
  timestamp: z.number().int().positive(),
});

/** POST /api/account/mfa/activate —— 激活待启用因子。 */
export const activateMfaSchema = z.object({
  mfaInfoId: z.number().int().positive(),
  code: z.string().trim().length(6),
});

/** POST /api/account/mfa/disable —— 关闭 MFA（step-up）。 */
export const disableMfaSchema = z.object({ code: z.string().trim().length(6) });

/** POST /api/account/identity/request-code —— 申请身份变更验证码。 */
export const requestCodeSchema = z.object({
  purpose: z.enum(["EMAIL_CURRENT", "EMAIL_NEW"]),
  newEmail: z.email().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ActivateMfaInput = z.infer<typeof activateMfaSchema>;
export type DisableMfaInput = z.infer<typeof disableMfaSchema>;
export type RequestCodeInput = z.infer<typeof requestCodeSchema>;
