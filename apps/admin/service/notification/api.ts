// apps/admin/service/notification/api.ts
// 通知域客户端调用出口：具名函数、全量路径；请求/响应类型同源于 ./types 与 ./schemas。
import { request } from "@cloud/request/client";
import type { Notice } from "./types";
import type { ListNoticesQuery, MarkReadBody } from "./schemas/notification.schema";

export const listNotice = (query: ListNoticesQuery) =>
  request.get<{ items: Notice[] }>("/api/notifications", { query });

export const getNoticeUnreadCount = () =>
  request.get<{ count: number }>("/api/notifications/unread-count");

export const getNoticeUnreadByParty = () =>
  request.get<{ counts: Record<string, number> }>("/api/notifications/unread-by-party");

export const markNoticeRead = (body: MarkReadBody) =>
  request.post("/api/notifications/read", body);
