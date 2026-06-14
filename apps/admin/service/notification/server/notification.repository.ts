// notification.repository.ts
// 通知域数据访问。纯函数（scopeWhere/unreadWhere）+ Prisma 查询（Task 4 追加）。
import "server-only";
import { prisma } from "@cloud/db";
import type { NoticeStatus } from "../types";

export type NoticeScope = { userId: number; partyId: number };

/** 作用域：本人 + (当前 party 或 全局)。供 list/count/markRead 共用，口径一致。 */
export function scopeWhere(s: NoticeScope) {
  return { userId: s.userId, OR: [{ belongToPartyId: s.partyId }, { belongToPartyId: null }] };
}

export function unreadWhere(s: NoticeScope) {
  return { ...scopeWhere(s), status: "UNREAD" as NoticeStatus };
}

type ListOpts = { skip: number; take: number; status?: NoticeStatus; module?: string; q?: string };

export async function listScoped(s: NoticeScope, opts: ListOpts) {
  const where: Record<string, unknown> = { ...scopeWhere(s) };
  if (opts.status) where.status = opts.status;
  if (opts.module) where.noticeType = { startsWith: `${opts.module}.` };
  if (opts.q) {
    where.AND = [
      {
        OR: [
          { title: { contains: opts.q, mode: "insensitive" } },
          { payload: { path: ["summary"], string_contains: opts.q } },
        ],
      },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.sysNotice.findMany({ where, orderBy: { creTime: "desc" }, skip: opts.skip, take: opts.take }),
    prisma.sysNotice.count({ where }),
  ]);
  return { rows, total };
}

export function countUnread(s: NoticeScope) {
  return prisma.sysNotice.count({ where: unreadWhere(s) });
}

export function findByIdScoped(s: NoticeScope, noticeId: string) {
  return prisma.sysNotice.findFirst({ where: { ...scopeWhere(s), noticeId } });
}

export async function markReadByIds(s: NoticeScope, ids: string[]): Promise<number> {
  const res = await prisma.sysNotice.updateMany({
    where: { ...unreadWhere(s), noticeId: { in: ids } },
    data: { status: "READ" },
  });
  return res.count;
}

export async function markAllRead(s: NoticeScope): Promise<number> {
  const res = await prisma.sysNotice.updateMany({ where: unreadWhere(s), data: { status: "READ" } });
  return res.count;
}

export function create(data: {
  userId: number;
  belongToPartyId: number | null;
  noticeType: string;
  title: string;
  payload: Parameters<typeof prisma.sysNotice.create>[0]["data"]["payload"];
}) {
  return prisma.sysNotice.create({
    data: { ...data, status: "UNREAD" },
  });
}
