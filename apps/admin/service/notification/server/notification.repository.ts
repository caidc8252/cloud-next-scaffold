// notification.repository.ts
// 通知域数据访问。纯函数（scopeWhere/unreadWhere）+ Prisma 查询（Task 4 追加）。
import "server-only";
import type { NoticeStatus } from "../types";

export type NoticeScope = { userId: number; partyId: number };

/** 作用域：本人 + (当前 party 或 全局)。供 list/count/markRead 共用，口径一致。 */
export function scopeWhere(s: NoticeScope) {
  return { userId: s.userId, OR: [{ belongToPartyId: s.partyId }, { belongToPartyId: null }] };
}

export function unreadWhere(s: NoticeScope) {
  return { ...scopeWhere(s), status: "UNREAD" as NoticeStatus };
}
