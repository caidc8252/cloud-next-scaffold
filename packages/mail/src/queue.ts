import { z } from "zod";

// 与外部发信平台约定的队列协议（单一真源，字段名 = wire 原样）。本仓只把"要发的邮件"
// 推进 mail:queue，外部平台消费后发出。字段集对齐对方契约：receivers / cc / title /
// content_type / content / images（CID 内联图）。改动此形状需两边协同。

export const EMAIL_QUEUE_KEY = "mail:queue";

const emailAddressSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.trim());

// CID 内联图：content 里以 <img src="cid:{content_id}"> 引用。本仓暂不使用（模板无内联图），
// 仅为对齐对方契约保留为可选。
const inlineImageSchema = z.object({
  content_id: z.string().min(1),
  content_type: z.string().min(1), // 如 image/png
  data: z.string().min(1), // base64
});

export const emailJobInputSchema = z.object({
  receivers: z.array(emailAddressSchema).min(1), // = To
  cc: z.array(emailAddressSchema).optional(),
  title: z.string().trim().min(1), // = subject（纯文本）
  // 默认 text/html：本仓只发极简 HTML；显式告知对方按 HTML 渲染（缺它可能被按纯文本发出）。
  content_type: z.string().default("text/html"),
  content: z.string().trim().min(1), // 完整 HTML 文档（含 <meta charset>），对方原样发
  images: z.array(inlineImageSchema).optional(),
});

// 入参类型用 z.input：content_type 可省（走默认）、cc/images 可省；调用方只需传 receivers/title/content。
export type EmailJobInput = z.input<typeof emailJobInputSchema>;
