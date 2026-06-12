import { z } from "zod";

// 与外部发信平台约定的队列协议（单一真源）。本仓只把"要发的邮件"推进 mail:queue，
// 外部平台消费后原样发出、不做任何加工。改动此形状需两边协同（暂不预留 from/html/version）。

export const EMAIL_QUEUE_KEY = "mail:queue";

const emailAddressSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.trim());

export const emailJobInputSchema = z.object({
  receivers: z.array(emailAddressSchema).min(1),
  title: z.string().trim().min(1), // = subject（纯文本）
  content: z.string().trim().min(1), // = 极简 email-safe HTML 正文（对方原样发）
});

export type EmailJobInput = z.infer<typeof emailJobInputSchema>;
