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

/**
 * 站内通知的**唯一生产者**（服务端内部；不暴露建通知 API，防伪造他人通知）。
 * 任何业务域 / 任何 app 想给某用户发站内通知就调它；对业务零认知。
 * 跨 app 可写同一 `sys_notice` 表（如 portal 写、admin 侧用户收）。
 *
 * 用法（在业务事件点，**非阻断**调用）：
 *   try {
 *     const locale = isLocale(raw) ? raw : "en";          // 收件人 sys_user.locale，收窄回退 en
 *     const t = await getTranslations({ locale });         // 按收件人语言（非 cookie 版）
 *     await createNotice({
 *       userId,                                            // 收件人
 *       belongToPartyId,                                   // 省略/null = 该用户跨 party 全局
 *       noticeType: "<module>.<event>",                    // module 前端派生图标，不落库
 *       title: t("notifications.events.<event>.title"),
 *       payload: {                                         // 四件套；文本均已按收件人语言渲染好
 *         summary: t("...summary"),                        // 必含，纯文本
 *         detail: t("...detail"),                          // 可选段落
 *         fields: [{ key: "ticket", value, mono: true }],  // key 走 notifications.fields.<key>
 *         links: [{ label, type: "button", url: "/..." }], // url 生产者拼好（同 app 相对/跨 app 绝对）
 *       },
 *     });
 *   } catch (err) { log.warn("... notice failed (non-blocking)", { err }); }
 *
 * 写一行 `SysNotice`（status=UNREAD），写后不可变（只 mark-read）。
 * 详见 `.claude/docs/notice.md`（含「接新埋点事件」配方）。
 */
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
