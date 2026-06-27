// notification.repository.ts
// 通知域数据访问（Prisma）。纯作用域 where-builder 拆到 notification.scope.ts（脱 DB 单测），此处复用并 re-export。
import "server-only";
import { prisma } from "@cloud/db";
import type { NoticeStatus } from "../schema/notification.types";
import { scopeWhere, unreadWhere, type NoticeScope } from "./notification.scope";

export { scopeWhere, unreadWhere } from "./notification.scope";
export type { NoticeScope } from "./notification.scope";

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

/**
 * 各 party 的未读数（party 切换器红点用）。**有意跨 party**：仅按 userId 收窄、按 belongToPartyId
 * 分组，不套作用域的当前 party 过滤；全局(null)不计入（恒可见、不会漏）。
 */
export async function unreadCountByParty(userId: number): Promise<Record<number, number>> {
  const rows = await prisma.sysNotice.groupBy({
    by: ["belongToPartyId"],
    where: { userId, status: "UNREAD", belongToPartyId: { not: null } },
    _count: { _all: true },
  });
  const out: Record<number, number> = {};
  for (const r of rows) {
    if (r.belongToPartyId != null) out[r.belongToPartyId] = r._count._all;
  }
  return out;
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
