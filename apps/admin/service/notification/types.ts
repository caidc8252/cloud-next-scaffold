// Notification domain types (mock-app phase).
//
// Shape mirrors the anticipated real API (SysNotice + a typed `payload`) so the
// mock→real swap touches only handler/store bodies, never these types or the
// client components that consume them. NOT marked server-only — the client
// components import these as type-only.

/** Coarse module taxonomy that drives the icon + colour of a notification. */
export type NoticeModule = "ticket" | "customer" | "app" | "order";

export type NoticeStatus = "UNREAD" | "READ";

/** Where a notification points — resolved onto a route by the consumer. */
export type NoticeNav = { kind: NoticeModule; id: string };

/** One label/value row in the detail metadata grid. `value` may be null (hidden). */
export type NoticeMetaRow = { label: string; value: string | null; mono?: boolean };

/** The person/org behind an actionable notification (assigner, commenter…). */
export type NoticeActor = { name: string; role: string; initials: string };

/**
 * Per-notification payload. `body` is the one-line summary shown in the bell and
 * list; the rest powers the detail page. Carries everything that lives nowhere
 * else (the typed note, the quote, the metadata, the CTA into the record).
 */
export type NoticePayload = {
  body: string;
  detailKind: "note" | "quote";
  detail: string;
  actorLabel?: string | null;
  actor?: NoticeActor | null;
  meta: NoticeMetaRow[];
  cta?: { label: string; nav: NoticeNav } | null;
  nav: NoticeNav;
};

/** Client-facing notification VO (one row of SysNotice, mapped). */
export type Notice = {
  id: string;
  /** Open noticeType, e.g. "ticket.assigned"; drives the detail template. */
  type: string;
  module: NoticeModule;
  title: string;
  status: NoticeStatus;
  /** ISO-8601 creation time; list/bell sort newest-first and derive Today/Earlier. */
  createdAt: string;
  payload: NoticePayload;
};
