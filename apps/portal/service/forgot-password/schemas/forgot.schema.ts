import { z } from "zod";

// 忘记密码三步入参。reset 的新密码走 RSA 密文（与登录/注册同姿态，不传明文）。
export const sendCodeSchema = z.object({
  email: z.string().trim().email(),
});

export const verifyCodeSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{6}$/),
});

export const resetSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{6}$/),
  encryptedPassword: z.string().min(1),
});

export type SendCodeInput = z.infer<typeof sendCodeSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
