"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { request } from "@cloud/request/client";
import type { Notice } from "@/service/notification/types";

/**
 * Client-side notification store (mock-app phase) — one source of truth shared
 * by the bell, the list page and the detail page, so a mark-read shows up in
 * all three at once (badge + rows). Seeded from the server in the (portal)
 * layout (no mount flash) and re-synced from the route handlers on focus; the
 * server store behind those handlers is the real source.
 *
 * Mounted once in the (portal) layout, wrapping both the header (bell) and the
 * page content (children).
 */
type NotificationsContextValue = {
  notices: Notice[];
  unreadCount: number;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({
  initial,
  children,
}: {
  initial: Notice[];
  children: React.ReactNode;
}) {
  const [notices, setNotices] = useState<Notice[]>(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await request.get<{ items: Notice[] }>("/api/notifications", {
        query: { limit: 100 },
      });
      setNotices(res.data.items);
    } catch {
      // Mock phase: keep the last known list on a transient failure.
    }
  }, []);

  // Cheap re-sync when the tab regains focus (mirrors the bell's poll-on-focus).
  // setState happens only inside the event callback, never synchronously here.
  useEffect(() => {
    const onFocus = () => {
      refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const want = new Set(ids);
      setNotices((prev) =>
        prev.map((n) => (want.has(n.id) ? { ...n, status: "READ" as const } : n)),
      );
      try {
        await request.post("/api/notifications/read", { ids });
      } catch {
        refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    setNotices((prev) => prev.map((n) => ({ ...n, status: "READ" as const })));
    try {
      await request.post("/api/notifications/read", { all: true });
    } catch {
      refresh();
    }
  }, [refresh]);

  const unreadCount = notices.reduce((c, n) => (n.status === "UNREAD" ? c + 1 : c), 0);

  return (
    <NotificationsContext.Provider
      value={{ notices, unreadCount, markRead, markAllRead, refresh }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return ctx;
}
