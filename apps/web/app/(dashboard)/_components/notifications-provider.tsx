"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getNoticeUnreadByParty,
  getNoticeUnreadCount,
  listNotice,
  markNoticeRead,
} from "@/modules/system/notification/client/notification.api";
import type { Notice } from "@/modules/system/notification/schema/notification.types";

type Ctx = {
  unreadCount: number;
  recentUnread: Notice[];
  unreadByParty: Record<number, number>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};
const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [recentUnread, setRecentUnread] = useState<Notice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByParty, setUnreadByParty] = useState<Record<number, number>>({});

  const refresh = useCallback(async () => {
    try {
      const [list, count, byParty] = await Promise.all([
        listNotice({ status: "UNREAD", page: 1, limit: 20 }),
        getNoticeUnreadCount(),
        getNoticeUnreadByParty(),
      ]);
      setRecentUnread(list.data.items);
      setUnreadCount(count.data.count);
      setUnreadByParty(
        Object.fromEntries(Object.entries(byParty.data.counts).map(([k, v]) => [Number(k), v])),
      );
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
    try { await markNoticeRead({ ids }); } finally { refresh(); }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setRecentUnread([]); setUnreadCount(0);
    try { await markNoticeRead({ all: true }); } finally { refresh(); }
  }, [refresh]);

  return <NotificationsContext.Provider value={{ unreadCount, recentUnread, unreadByParty, markRead, markAllRead, refresh }}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
