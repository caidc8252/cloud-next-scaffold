import { z } from "zod";

export const listNoticesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(["UNREAD", "READ"]).optional(),
  module: z.string().min(1).optional(),
  q: z.string().trim().min(1).optional(),
});
export type ListNoticesQuery = z.infer<typeof listNoticesQuerySchema>;
export type ListNoticesQuery = z.infer<typeof listNoticesQuerySchema>;


export const markReadBodySchema = z.union([
  z.object({ ids: z.array(z.string()).min(1) }),
  z.object({ all: z.literal(true) }),
]);
export type MarkReadBody = z.infer<typeof markReadBodySchema>;

export const createNoticeInputSchema = z.object({
  userId: z.number().int(),
  belongToPartyId: z.number().int().nullable().optional(),
  noticeType: z.string().min(1),
  title: z.string(),
  payload: z.object({
    summary: z.string().min(1),
    detail: z.string().min(1), // 必填：禁止空 detail 记录（创建入口强制）
    fields: z.array(z.object({ key: z.string(), value: z.string(), mono: z.boolean().optional() })).optional(),
    links: z.array(z.object({ label: z.string(), type: z.enum(["text", "button"]), url: z.string() })).optional(),
  }),
});
export type CreateNoticeInput = z.infer<typeof createNoticeInputSchema>;
