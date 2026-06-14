import { Ticket, Users, Package, Banknote, KeyRound, Bell, type LucideIcon } from "lucide-react";
import type { Notice } from "@/service/notification/types";

/**
 * Module taxonomy → icon + colour, shared by the bell, the list and the detail.
 * `module` is no longer on the Notice VO; it is derived client-side from the
 * `type` field prefix via `moduleOf()`. `labelKey` resolves under the
 * `notifications` i18n namespace.
 */

export type DerivedModule = "ticket" | "customer" | "app" | "order" | "account" | "default";

export const MODULE_META: Record<DerivedModule, { icon: LucideIcon; labelKey: string; chip: string }> = {
  ticket:   { icon: Ticket,   labelKey: "module.ticket",   chip: "bg-info-bg text-info-strong border-info-strong/20" },
  customer: { icon: Users,    labelKey: "module.customer", chip: "bg-primary-50 text-primary-700 border-primary-500/25" },
  app:      { icon: Package,  labelKey: "module.app",      chip: "bg-violet-50 text-violet-700 border-violet-500/25" },
  order:    { icon: Banknote, labelKey: "module.order",    chip: "bg-success-bg text-success-strong border-success-strong/20" },
  account:  { icon: KeyRound, labelKey: "module.account",  chip: "bg-surface-3 text-content-secondary border-line-default" },
  default:  { icon: Bell,     labelKey: "module.default",  chip: "bg-surface-3 text-content-secondary border-line-default" },
};

const KNOWN_MODULES = new Set<string>(["ticket", "customer", "app", "order", "account"]);

/**
 * Derive the display module from a noticeType string (format: "<module>.<event>").
 * Falls back to "default" for null, unknown prefixes, or types without a dot.
 */
export function moduleOf(type: string | null): DerivedModule {
  const prefix = type?.includes(".") ? type.split(".")[0] : undefined;
  return prefix && KNOWN_MODULES.has(prefix) ? (prefix as DerivedModule) : "default";
}

/**
 * Navigate to a notice link: relative paths use soft (client) navigation;
 * same-origin absolute URLs use soft navigation; cross-origin uses full
 * page assign. Invalid URLs are silently ignored (guards open-redirect).
 */
export function openNoticeLink(router: { push: (u: string) => void }, url: string): void {
  if (url.startsWith("/")) {
    router.push(url);
    return;
  }
  try {
    const u = new URL(url);
    if (u.origin === window.location.origin) {
      router.push(u.pathname + u.search);
      return;
    }
    // Cross-origin: direct assign (caller may add an allowlist here later)
    window.location.assign(url);
  } catch {
    /* Non-parseable URL — ignore */
  }
}

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
