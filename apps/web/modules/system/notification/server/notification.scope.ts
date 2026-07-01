// notification.scope.ts
// 纯作用域 where-builder（无 Prisma 依赖，可脱离 DB 单测）。repository 复用之。
import type { NoticeStatus } from "../schema/notification.types";

export type NoticeScope = { userId: number; partyId: number };

/** 作用域：本人 + (当前 party 或 全局)。供 list/count/markRead 共用，口径一致。 */
export function scopeWhere(s: NoticeScope) {
  return { userId: s.userId, OR: [{ belongToPartyId: s.partyId }, { belongToPartyId: null }] };
}

export function unreadWhere(s: NoticeScope) {
  return { ...scopeWhere(s), status: "UNREAD" as NoticeStatus };
}
