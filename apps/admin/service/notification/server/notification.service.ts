// notification.service.ts
import "server-only";
import type { Pager } from "@cloud/request";
import type { ActiveSession } from "@cloud/permissions/server";
import type { Notice } from "../types";
import { createNoticeInputSchema, type CreateNoticeInput, type ListNoticesQuery, type MarkReadBody } from "../schemas/notification.schema";
import * as repo from "./notification.repository";
import { toNotice } from "./notification.mapper";

const scopeOf = (s: ActiveSession): repo.NoticeScope => ({ userId: s.userId, partyId: s.currentPartyId });

export async function listNotices(session: ActiveSession, query: ListNoticesQuery): Promise<{ items: Notice[]; pager: Pager }> {
  const { page, limit, status, module, q } = query;
  const { rows, total } = await repo.listScoped(scopeOf(session), { skip: (page - 1) * limit, take: limit, status, module, q });
  return { items: rows.map(toNotice), pager: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export function unreadCount(session: ActiveSession): Promise<number> {
  return repo.countUnread(scopeOf(session));
}

export async function getNoticeByIdScoped(session: ActiveSession, id: string): Promise<Notice | null> {
  const row = await repo.findByIdScoped(scopeOf(session), id);
  return row ? toNotice(row) : null;
}

export function markRead(session: ActiveSession, body: MarkReadBody): Promise<number> {
  const scope = scopeOf(session);
  return "all" in body ? repo.markAllRead(scope) : repo.markReadByIds(scope, body.ids);
}

/** 通用生产者：服务端内部，任何域/app 直接调用；对业务零认知。文本由调用方按收件人语言渲染好。 */
export async function createNotice(input: CreateNoticeInput): Promise<void> {
  const v = createNoticeInputSchema.parse(input);
  await repo.create({
    userId: v.userId,
    belongToPartyId: v.belongToPartyId ?? null,
    noticeType: v.noticeType,
    title: v.title,
    payload: v.payload,
  });
}
