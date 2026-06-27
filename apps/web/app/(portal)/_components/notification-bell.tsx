"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronRight } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  cn,
} from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Notice } from "@/service/notification/types";
import { useNotifications } from "./notifications-provider";
import {
  MODULE_META,
  groupOf,
  isUnread,
  moduleOf,
  useRelTime,
  type NoticeGroup,
} from "../notifications/_lib/notice-meta";

/**
 * Notification bell button + popover (client component).
 *
 * A quick "scan the latest" surface: UNREAD-only, newest-first, capped at 20,
 * grouped Today / Earlier, with Mark-all and a "View all notifications" footer
 * routing to /notifications. Reads/writes the shared NotificationsProvider, so
 * marking read here updates the badge, the list page and the detail in sync.
 *
 * Mounted via AppHeader's `notification` slot (see portal-header.tsx); the
 * provider is mounted once in the (portal) layout.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const { recentUnread, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  // recentUnread is already server-limited to top-20 unread; no client filter needed.
  const truncated = 0;
  const hasHistory = recentUnread.length > 0 || unreadCount > 0;

  const groups: { g: NoticeGroup; rows: Notice[] }[] = (
    ["today", "earlier"] as const
  )
    .map((g) => ({ g, rows: recentUnread.filter((n) => groupOf(n.createdAt) === g) }))
    .filter((x) => x.rows.length > 0);

  const openNotice = (n: Notice) => {
    markRead([n.id]);
    setOpen(false);
    router.push(`/notifications/${n.id}`);
  };
  const viewAll = () => {
    setOpen(false);
    router.push("/notifications");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("title")}
            className="relative text-content-secondary"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid min-w-4 h-4 place-items-center rounded-full bg-error px-1 text-2xs font-medium leading-none text-content-inverse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="w-96 p-0">
        <PopoverHeader className="flex flex-row items-center gap-2 px-3 py-2 border-b border-line-subtle">
          <PopoverTitle className="text-md">{t("title")}</PopoverTitle>
          {unreadCount > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary-50 px-1.5 text-2xs font-semibold text-primary-700">
              {unreadCount}
            </span>
          )}
          <Button
            variant="ghost"
            size="xs"
            iconLeft={<Check className="size-3" />}
            disabled={unreadCount === 0}
            onClick={() => markAllRead()}
            className="ml-auto text-content-secondary"
          >
            {t("markAllRead")}
          </Button>
        </PopoverHeader>

        <div className="max-h-96 overflow-auto">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-3 py-10 text-center">
              <Bell className="size-7 text-content-tertiary" />
              <div className="text-md font-medium text-content-primary">
                {hasHistory ? t("empty.caughtUp") : t("empty.none")}
              </div>
              <div className="text-xs text-content-tertiary">
                {hasHistory ? t("empty.caughtUpDesc") : t("empty.noneDesc")}
              </div>
            </div>
          ) : (
            groups.map(({ g, rows }) => (
              <div key={g}>
                <div className="sticky top-0 bg-surface-2 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                  {t(`group.${g}`)}
                </div>
                {rows.map((n) => (
                  <BellRow
                    key={n.id}
                    notice={n}
                    onOpen={() => openNotice(n)}
                    onMarkRead={() => markRead([n.id])}
                    markReadLabel={t("markRead")}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-line-subtle">
          {truncated > 0 && (
            <div className="px-3 pt-2 text-center text-2xs text-content-tertiary">
              {t("showingUnread", { shown: recentUnread.length, total: recentUnread.length + truncated })}
            </div>
          )}
          <Button
            variant="ghost"
            block
            iconRight={<ChevronRight className="size-3" />}
            onClick={viewAll}
            className="rounded-none text-xs font-medium text-primary-700"
          >
            {t("viewAll")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BellRow({
  notice,
  onOpen,
  onMarkRead,
  markReadLabel,
}: {
  notice: Notice;
  onOpen: () => void;
  onMarkRead: () => void;
  markReadLabel: string;
}) {
  const t = useTranslations("notifications");
  const relTime = useRelTime();
  const meta = MODULE_META[moduleOf(notice.type)];
  const Icon = meta.icon;
  const unread = isUnread(notice);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 px-3 py-2.5 hover:bg-surface-hover",
        unread && "bg-primary-50/40",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border",
          meta.chip,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-md text-content-primary",
              unread && "font-semibold",
            )}
          >
            {notice.title}
          </span>
          {notice.belongToPartyId == null && (
            <span className="shrink-0 rounded border border-line-subtle bg-surface-3 px-1 py-px text-2xs font-medium text-content-tertiary">
              {t("party.system")}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-content-secondary">{notice.payload.summary}</div>
        <div className="mt-0.5 text-2xs text-content-tertiary">{relTime(notice.createdAt)}</div>
      </div>
      {unread ? (
        <Button
          variant="ghost"
          size="icon-xs"
          title={markReadLabel}
          aria-label={markReadLabel}
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
          className="mt-0.5 shrink-0 text-content-tertiary"
        >
          <Check className="size-3.5" />
        </Button>
      ) : (
        <ChevronRight className="mt-1.5 size-3.5 shrink-0 text-content-tertiary" />
      )}
    </div>
  );
}
