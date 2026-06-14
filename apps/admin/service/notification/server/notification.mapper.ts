// notification.mapper.ts
import "server-only";
import type { Notice, NoticePayload, NoticeStatus } from "../types";

// SysNotice 行 → Notice VO。本地结构化行类型（团队范式：mapper 不引 Prisma 模型类型，
// 见 account.mapper 的 ProfileRow），只声明 mapper 实际读取的字段。
type SysNoticeRow = {
  noticeId: string;
  noticeType: string | null;
  title: string | null;
  status: string;
  creTime: Date;
  payload: unknown;
};

export function toNotice(row: SysNoticeRow): Notice {
  return {
    id: row.noticeId,
    type: row.noticeType,
    title: row.title,
    status: row.status as NoticeStatus,
    createdAt: row.creTime.toISOString(),
    payload: (row.payload ?? { summary: "" }) as NoticePayload,
  };
}
