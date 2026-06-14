// apps/admin/service/notification/types.ts
// 通知域类型（真实后端）。payload 四件套（裁决 C1）；module 客户端派生、不在 VO。
export type NoticeModule = "ticket" | "customer" | "app" | "order" | "account";
export type NoticeStatus = "UNREAD" | "READ";

export type NoticeField = { key: string; value: string; mono?: boolean };
export type NoticeLink = { label: string; type: "text" | "button"; url: string };

export type NoticePayload = {
  summary: string;          // 必含，纯文本
  detail: string;           // 必含，纯文本段落（创建入口强制非空）
  fields?: NoticeField[];
  links?: NoticeLink[];
};

export type Notice = {
  id: string;
  type: string | null;      // noticeType（"<module>.<event>"）
  title: string | null;     // 生产者给、展示原样
  status: NoticeStatus;
  createdAt: string;        // ISO
  belongToPartyId: number | null; // 归属 party；null = 系统/全局（任一 party 可见）。客户端据此显「系统」或当前平台名
  payload: NoticePayload;
};
