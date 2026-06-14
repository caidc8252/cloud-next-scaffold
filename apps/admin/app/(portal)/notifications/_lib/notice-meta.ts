import { Ticket, Users, Package, Banknote, type LucideIcon } from "lucide-react";
import type { Notice, NoticeModule } from "@/service/notification/types";

/**
 * Module taxonomy → icon + colour, shared by the bell, the list and the detail.
 * Colours map the prototype's four tints onto semantic tokens (ticket→info,
 * customer→primary, app→violet, order→success). `labelKey` resolves under the
 * `notifications` i18n namespace.
 */
export const MODULE_META: Record<
  NoticeModule,
  { icon: LucideIcon; labelKey: string; chip: string }
> = {
  ticket: {
    icon: Ticket,
    labelKey: "module.ticket",
    chip: "bg-info-bg text-info-strong border-info-strong/20",
  },
  customer: {
    icon: Users,
    labelKey: "module.customer",
    chip: "bg-primary-50 text-primary-700 border-primary-500/25",
  },
  app: {
    icon: Package,
    labelKey: "module.app",
    chip: "bg-violet-50 text-violet-700 border-violet-500/25",
  },
  order: {
    icon: Banknote,
    labelKey: "module.order",
    chip: "bg-success-bg text-success-strong border-success-strong/20",
  },
};

/**
 * Relative time, past/future symmetric, falling back to an absolute date beyond
 * 30 days. Mirrors the system helper; kept feature-local to avoid a cross-feature
 * import.
 */
export function relTime(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const phrase = (n: number, unit: string) => (ms >= 0 ? `in ${n}${unit}` : `${n}${unit} ago`);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return phrase(Math.floor(abs / 60_000), "m");
  if (abs < 86_400_000) return phrase(Math.floor(abs / 3_600_000), "h");
  if (abs < 30 * 86_400_000) return phrase(Math.floor(abs / 86_400_000), "d");
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export type NoticeGroup = "today" | "earlier";

/** Bell section grouping: same calendar day as now → Today, else Earlier. */
export function groupOf(iso: string): NoticeGroup {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  return sameDay ? "today" : "earlier";
}

export const isUnread = (n: Notice) => n.status === "UNREAD";
