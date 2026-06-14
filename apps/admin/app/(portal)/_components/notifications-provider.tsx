"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { request } from "@cloud/request/client";
import type { Notice } from "@/service/notification/types";

type Ctx = {
  unreadCount: number;
  recentUnread: Notice[];
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};
const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [recentUnread, setRecentUnread] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        request.get<{ items: Notice[] }>("/api/notifications", { query: { status: "UNREAD", page: 1, limit: 20 } }),
        request.get<{ count: number }>("/api/notifications/unread-count"),
      ]);
      setRecentUnread(list.data.items);
      setUnreadCount(count.data.count);
    } catch { /* 保持上次值 */ }
  }, []);

  useEffect(() => {
    const onFocus = () => refresh();
    void (async () => { await refresh(); })();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const want = new Set(ids);
    setRecentUnread((p) => p.filter((n) => !want.has(n.id)));
    setUnreadCount((c) => Math.max(0, c - ids.length));
    try { await request.post("/api/notifications/read", { ids }); } finally { refresh(); }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setRecentUnread([]); setUnreadCount(0);
    try { await request.post("/api/notifications/read", { all: true }); } finally { refresh(); }
  }, [refresh]);

  return <NotificationsContext.Provider value={{ unreadCount, recentUnread, markRead, markAllRead, refresh }}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
