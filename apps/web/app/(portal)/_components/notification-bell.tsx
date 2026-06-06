"use client";

import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@cloud/ui";

/**
 * Notification bell button + popover (client component).
 *
 * Current scope: STATIC — no data fetched, no state, always shows zero
 * notifications with an empty state inside the popover. The bell is mounted
 * so the UI shape is locked in and ready for backend wiring later.
 *
 * Mounted via AppHeader's `notification` slot (see portal-header.tsx).
 *
 * ────────────────────────────────────────────────────────────────
 * How to wire real notifications (when backend lands)
 * ────────────────────────────────────────────────────────────────
 *
 * Step 1 — Schema + producer (server side, not this file)
 *   Add a sys_notification table (recipientUserId, partnerId, type, payload,
 *   readAt, creTime). Provide a server-side enqueue function in
 *   apps/web/lib/notifications/server.ts that all features call to write rows.
 *
 * Step 2 — Route handlers (server side)
 *   GET    /api/notifications              list (paginated)
 *   GET    /api/notifications/unread-count count only (cheap, for the badge)
 *   POST   /api/notifications/read         body: { ids?: number[], all?: boolean }
 *   All three guarded by assertPermissions() and scoped to current partnerId.
 *
 * Step 3 — Hook (client side, this file)
 *   Replace the hardcoded `count = 0` and empty body below with a hook:
 *
 *     const { count, items, markRead } = useNotifications();
 *
 *   Implementation choices:
 *   - SWR/React Query: fetch count every 30-60s while document is visible
 *   - useEffect + setInterval: lighter, no extra deps
 *   - SSE: GET /api/notifications/stream — keep `useNotifications` as the
 *     single seam so swapping poll → stream does not touch any UI
 *
 * Step 4 — Badge wiring
 *   The badge below is already conditionally rendered when count > 0.
 *   Just pass the live count in. Cap display at "99+" for readability.
 *
 * Step 5 — Item rendering
 *   Inside <PopoverContent>, render the list:
 *     - Group by readAt === null vs not, or just sort by creTime desc
 *     - Click item → router.push(item.link) + optimistic markRead(item.id)
 *     - "Mark all as read" button at the top
 *     - Show NOTIFICATION_TYPES[item.type] metadata (icon + title template)
 *
 * Step 6 — Real-time refresh
 *   On focus/visibilitychange, refetch count. On server action that produces
 *   a notification, the next poll picks it up — no manual revalidate needed.
 *
 * ────────────────────────────────────────────────────────────────
 * Caveats
 * ────────────────────────────────────────────────────────────────
 * - Mount once (in PortalHeader, lives in portal layout). Multiple mounts
 *   would multiply poll requests.
 * - Permission scope is per-partner; on partner switch the list must reset
 *   (current partnerId is part of session, so the route handler handles it).
 * - The popover is anchored to the bell button — keep <PopoverTrigger> as
 *   the bell, do not separate them.
 */
export function NotificationBell() {
  const count = 10;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-content-secondary hover:bg-surface-hover hover:text-content-primary transition-colors cursor-pointer"
          >
            <Bell size={15} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-error text-[10px] font-medium leading-4 text-content-inverse text-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <PopoverHeader className="px-3 py-2 border-b border-line-subtle">
          <PopoverTitle className="text-sm">Notifications</PopoverTitle>
        </PopoverHeader>
        <div className="px-3 py-8 text-center text-sm text-content-tertiary">
          No notifications.
        </div>
      </PopoverContent>
    </Popover>
  );
}
