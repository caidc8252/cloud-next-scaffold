import { z } from "zod";

// 自助找回（触发）+ 重置消费端入参。统一 token 链接机制：触发发链接、消费用 token。
export const sendLinkSchema = z.object({
  email: z.string().trim().pipe(z.email()),
});

// 设新密码（自助/管理员链接共用消费端）。新密码走 RSA 密文（与登录/注册同姿态）。
export const resetSchema = z.object({
  token: z.string().min(1),
  encryptedPassword: z.string().min(1),
});

export type SendLinkInput = z.infer<typeof sendLinkSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
