// notification.mapper.ts
import "server-only";
import type { SysNotice } from "@cloud/db/generated/prisma/client";
import type { Notice, NoticePayload, NoticeStatus } from "../types";

export function toNotice(row: SysNotice): Notice {
  return {
    id: row.noticeId,
    type: row.noticeType,
    title: row.title,
    status: row.status as NoticeStatus,
    createdAt: row.creTime.toISOString(),
    payload: (row.payload ?? { summary: "" }) as NoticePayload,
  };
}
