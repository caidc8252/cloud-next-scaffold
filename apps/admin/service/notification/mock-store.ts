import "server-only";

import type {
  Notice,
  NoticeModule,
  NoticeNav,
  NoticePayload,
} from "./types";

/**
 * In-memory notification store (mock-app phase) — the SINGLE source of truth
 * behind the bell, the list page and the detail page. Every route handler
 * reads/writes THIS module, so a mark-read mutation shows up everywhere that
 * reads it and survives navigation within the server process.
 *
 * Swap to real later by replacing this file with a repository/service that
 * queries SysNotice; the exported function surface (list/getById/unreadCount/
 * markRead/markAllRead) is the contract the handlers depend on.
 *
 * The seed mirrors the design prototype 1:1 and pre-bakes each row's detail
 * payload via `enrich()` (the prototype's NC_enrich) — so the store already
 * holds the fully-shaped `payload` a real producer would have written.
 */

type SeedRow = {
  id: string;
  module: NoticeModule;
  title: string;
  body: string;
  nav: NoticeNav;
  /** Minutes before "now" (resolved once at module load). */
  offsetMin: number;
  unread: boolean;
};

// ── Prototype seed (newest-first) ──────────────────────────────────────────
const SEED: SeedRow[] = [
  // Today
  { id: "n-01", module: "ticket", unread: true, offsetMin: 5,
    title: "A ticket was assigned to you",
    body: "T-2026-003 · Security alert — escalated to NPT",
    nav: { kind: "ticket", id: "T-2026-003" } },
  { id: "n-03", module: "ticket", unread: true, offsetMin: 40,
    title: "A ticket was escalated to NPT",
    body: "Brightleaf Retail raised T-2026-008 to the NPT queue",
    nav: { kind: "ticket", id: "T-2026-008" } },
  { id: "n-04", module: "app", unread: true, offsetMin: 60,
    title: "A subscribed app was unpublished",
    body: "Smart Receipt was withdrawn by its publisher",
    nav: { kind: "app", id: "app-smart-receipt" } },
  { id: "n-05", module: "ticket", unread: true, offsetMin: 120,
    title: "New comment on a ticket you handle",
    body: "ISO replied on T-2026-001 · Payment failure",
    nav: { kind: "ticket", id: "T-2026-001" } },
  { id: "n-06", module: "customer", unread: true, offsetMin: 180,
    title: "Invitation accepted",
    body: "li.mei@northwind.io registered and accepted your invite",
    nav: { kind: "customer", id: "c-001" } },
  { id: "n-07", module: "order", unread: false, offsetMin: 300,
    title: "Your order is complete",
    body: "SO-2026-0184 completed · sample devices activated",
    nav: { kind: "order", id: "o-2026-0184" } },

  // Earlier
  { id: "n-09", module: "ticket", unread: false, offsetMin: 1560,
    title: "A ticket you handled was reopened",
    body: "T-2026-006 was reopened by the ISO",
    nav: { kind: "ticket", id: "T-2026-006" } },
  { id: "n-10", module: "customer", unread: false, offsetMin: 1620,
    title: "Invitation link expires tomorrow",
    body: "Your invite to Helios Payments expires in 24 hours",
    nav: { kind: "customer", id: "c-002" } },
  { id: "n-11", module: "app", unread: false, offsetMin: 1700,
    title: "App version scan completed",
    body: "Loyalty+ 1.4.0-rc1 scan result: dirty",
    nav: { kind: "app", id: "app-loyalty-plus" } },
  { id: "n-12", module: "ticket", unread: false, offsetMin: 17280,
    title: "NPT replied to your ticket",
    body: "Resolution posted on T-2026-002 · Terminal offline",
    nav: { kind: "ticket", id: "T-2026-002" } },
  { id: "n-14", module: "order", unread: false, offsetMin: 18720,
    title: "Your order is complete",
    body: "SO-2026-0179 completed · 24 devices activated",
    nav: { kind: "order", id: "o-2026-0179" } },
  { id: "n-15", module: "customer", unread: false, offsetMin: 18960,
    title: "Invitation accepted",
    body: "ops@brightleaf.co registered and accepted your invite",
    nav: { kind: "customer", id: "c-003" } },
  { id: "n-16", module: "ticket", unread: false, offsetMin: 20160,
    title: "A ticket was assigned to you",
    body: "T-2026-004 · Firmware rollback request",
    nav: { kind: "ticket", id: "T-2026-004" } },
  { id: "n-17", module: "app", unread: false, offsetMin: 20400,
    title: "App version scan completed",
    body: "Fleet Insights 2.1.0 scan result: clean",
    nav: { kind: "app", id: "app-fleet-insights" } },
  { id: "n-18", module: "customer", unread: false, offsetMin: 21600,
    title: "Invitation link expired",
    body: "Your invite to Cypress Roastery expired unused",
    nav: { kind: "customer", id: "c-004" } },
  { id: "n-19", module: "ticket", unread: false, offsetMin: 21840,
    title: "New comment on a ticket you handle",
    body: "ISO replied on T-2026-005 · Settlement mismatch",
    nav: { kind: "ticket", id: "T-2026-005" } },
  { id: "n-21", module: "order", unread: false, offsetMin: 23040,
    title: "Your order is complete",
    body: "SO-2026-0173 completed · 12 devices activated",
    nav: { kind: "order", id: "o-2026-0173" } },
  { id: "n-22", module: "app", unread: false, offsetMin: 23280,
    title: "A subscribed app was unpublished",
    body: "Tip Manager was withdrawn by its publisher",
    nav: { kind: "app", id: "app-tip-manager" } },
  { id: "n-23", module: "ticket", unread: false, offsetMin: 24480,
    title: "A ticket you handled was reopened",
    body: "T-2026-007 was reopened by the ISO",
    nav: { kind: "ticket", id: "T-2026-007" } },
  { id: "n-24", module: "customer", unread: false, offsetMin: 24720,
    title: "Invitation accepted",
    body: "admin@cypressroast.com registered and accepted your invite",
    nav: { kind: "customer", id: "c-005" } },
  { id: "n-25", module: "ticket", unread: false, offsetMin: 25920,
    title: "NPT replied to your ticket",
    body: "Resolution posted on T-2026-003 · Security alert",
    nav: { kind: "ticket", id: "T-2026-003" } },
  { id: "n-27", module: "app", unread: false, offsetMin: 27360,
    title: "App version scan completed",
    body: "Smart Receipt 3.0.0 scan result: clean",
    nav: { kind: "app", id: "app-smart-receipt" } },
  { id: "n-28", module: "order", unread: false, offsetMin: 27600,
    title: "Your order is complete",
    body: "SO-2026-0168 completed · 6 devices activated",
    nav: { kind: "order", id: "o-2026-0168" } },
  { id: "n-29", module: "ticket", unread: false, offsetMin: 28800,
    title: "A ticket was escalated to NPT",
    body: "Helios Payments raised T-2026-009 to the NPT queue",
    nav: { kind: "ticket", id: "T-2026-009" } },
  { id: "n-30", module: "customer", unread: false, offsetMin: 29040,
    title: "Invitation link expired",
    body: "Your invite to Pier 41 Foods expired unused",
    nav: { kind: "customer", id: "c-006" } },
];

// ── Detail enrichment (ported from the prototype's NC_enrich) ───────────────
const NPT_PEOPLE = [
  { name: "Maya Hernandez", role: "Tier 2 Support", initials: "MH" },
  { name: "Ravi Kapoor", role: "Onboarding Ops", initials: "RK" },
  { name: "Sofia Chen", role: "Contracts Lead", initials: "SC" },
  { name: "Liam Thompson", role: "Tier 2 Support", initials: "LT" },
  { name: "Wei Chen", role: "Risk Manager", initials: "WC" },
];
const ISO_ORGS = [
  "Brightleaf Retail", "Helios Payments", "Northwind Commerce",
  "Cypress Roastery", "Pier 41 Foods",
];

function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length]!;
}

function kindOf(row: SeedRow): string {
  const t = row.title.toLowerCase();
  if (row.module === "ticket") {
    if (t.includes("assigned")) return "ticket.assigned";
    if (t.includes("escalated")) return "ticket.escalated";
    if (t.includes("comment")) return "ticket.comment";
    if (t.includes("reopened")) return "ticket.reopened";
    if (t.includes("replied")) return "ticket.reply";
  }
  if (row.module === "customer") {
    if (t.includes("accepted")) return "customer.accepted";
    if (t.includes("expires")) return "customer.expiring";
    if (t.includes("expired")) return "customer.expired";
  }
  if (row.module === "app") {
    if (t.includes("unpublished")) return "app.unpublished";
    if (t.includes("scan")) return "app.scan";
  }
  if (row.module === "order") return "order.complete";
  return row.module;
}

function enrich(row: SeedRow, kind: string): Omit<NoticePayload, "body" | "nav"> {
  const ref = row.nav.id;
  const org = pick(ISO_ORGS, row.id);
  const who = pick(NPT_PEOPLE, row.id);
  const orgActor = { name: org, role: "ISO contact", initials: org.slice(0, 2).toUpperCase() };
  const ticketCta = { label: `Open ticket ${ref}`, nav: row.nav };
  const custCta = { label: "Open customer", nav: row.nav };
  const appCta = { label: "Open app", nav: row.nav };
  const orderCta = { label: `Open order ${ref}`, nav: row.nav };

  switch (kind) {
    case "ticket.assigned":
      return { actorLabel: "Assigned by", actor: who, detailKind: "note",
        detail: `${org} reports intermittent card-reader failures on 3 of 8 checkout lanes since the 2.4.1 firmware push. Terminal logs show EMV kernel timeouts on tap. Assigning to you for L2 triage — please confirm whether a firmware rollback is warranted before end of day.`,
        meta: [
          { label: "Ticket", value: ref, mono: true },
          { label: "Priority", value: "High" },
          { label: "Customer", value: org },
          { label: "SLA due", value: "in 4 hours" },
        ], cta: ticketCta };
    case "ticket.escalated":
      return { actorLabel: "Escalated by", actor: orgActor, detailKind: "note",
        detail: `Tier 1 could not resolve within SLA. Customer's settlement batch is failing nightly and the store cannot reconcile. Escalating to the NPT queue for engineering review — full diagnostic bundle attached on the ticket.`,
        meta: [
          { label: "Ticket", value: ref, mono: true },
          { label: "Raised by", value: org },
          { label: "Queue", value: "NPT · Engineering" },
          { label: "Priority", value: "High" },
        ], cta: ticketCta };
    case "ticket.comment":
      return { actorLabel: "Comment from", actor: orgActor, detailKind: "quote",
        detail: `We tried the suggested re-pairing steps on two terminals and the issue persists after reboot. Attaching a fresh log export from this morning — the timeout still appears around 06:14 UTC. Let us know if you need remote access to the device.`,
        meta: [
          { label: "Ticket", value: ref, mono: true },
          { label: "Commenter", value: org },
        ], cta: ticketCta };
    case "ticket.reopened":
      return { actorLabel: "Reopened by", actor: orgActor, detailKind: "note",
        detail: `The fix held for 3 days but the card-reader timeout returned this morning on the same lane. Reopening — please re-investigate; we can provide a maintenance window tonight after 22:00 local.`,
        meta: [
          { label: "Ticket", value: ref, mono: true },
          { label: "Reopened by", value: org },
          { label: "Previously", value: "Resolved" },
        ], cta: ticketCta };
    case "ticket.reply":
      return { actorLabel: "Resolved by", actor: who, detailKind: "note",
        detail: `Root cause was an EMV kernel regression in 2.4.1. Pushed the 2.4.2 hotfix to the affected fleet and confirmed clean transactions on all lanes for 24h. Marking resolved — please confirm on your side before we close.`,
        meta: [
          { label: "Ticket", value: ref, mono: true },
          { label: "Resolved by", value: who.name },
          { label: "Resolution", value: "Firmware hotfix 2.4.2" },
        ], cta: ticketCta };
    case "customer.accepted":
      return { actorLabel: null, actor: null, detailKind: "note",
        detail: `The operator you invited has completed registration and accepted the invitation. The customer account is now active and ready for contract setup.`,
        meta: [
          { label: "Operator", value: row.body.split(" ")[0]! },
          { label: "Status", value: "Active" },
          { label: "Invited by", value: "You" },
        ], cta: custCta };
    case "customer.expiring":
      return { actorLabel: null, actor: null, detailKind: "note",
        detail: `The invitation link you sent has not been used and expires within 24 hours. After expiry the operator will need a fresh invitation to register.`,
        meta: [
          { label: "Expires", value: "in 24 hours" },
          { label: "Status", value: "Pending" },
          { label: "Invited by", value: "You" },
        ], cta: { label: "Open customer · resend invite", nav: row.nav } };
    case "customer.expired":
      return { actorLabel: null, actor: null, detailKind: "note",
        detail: `The invitation link you sent expired before it was used. Send a new invitation if this operator still needs access.`,
        meta: [
          { label: "Status", value: "Expired" },
          { label: "Invited by", value: "You" },
        ], cta: { label: "Open customer · resend invite", nav: row.nav } };
    case "app.unpublished":
      return { actorLabel: "Publisher", actor: null, detailKind: "note",
        detail: `The publisher has withdrawn this app from the catalog. Subscribed terminals will keep the installed version, but no new installs or updates are available until it is republished.`,
        meta: [
          { label: "App", value: row.body.split(" was")[0]! },
          { label: "Action", value: "Unpublished" },
        ], cta: appCta };
    case "app.scan": {
      const dirty = /dirty/i.test(row.body);
      return { actorLabel: null, actor: null, detailKind: "note",
        detail: dirty
          ? `The security scan flagged this version. 1 high and 2 medium findings were detected, including an over-broad permission request. Review the report before promoting this version to the catalog.`
          : `The security scan completed with no findings. This version is clear to promote to the catalog.`,
        meta: [
          { label: "App version", value: row.body.split(" scan")[0]!, mono: true },
          { label: "Result", value: dirty ? "Dirty · 3 findings" : "Clean" },
        ], cta: appCta };
    }
    case "order.complete":
      return { actorLabel: null, actor: null, detailKind: "note",
        detail: `All sample devices on this order have been activated and the order is now complete. Activation records are available on the order detail page.`,
        meta: [
          { label: "Order", value: ref, mono: true },
          { label: "Status", value: "Complete" },
        ], cta: orderCta };
    default:
      return { actorLabel: null, actor: null, detailKind: "note", detail: row.body, meta: [], cta: null };
  }
}

// ── Build the store at module load (timestamps anchored to "now") ───────────
const NOW = Date.now();

function build(row: SeedRow): Notice {
  const kind = kindOf(row);
  const { detailKind, detail, actorLabel, actor, meta, cta } = enrich(row, kind);
  return {
    id: row.id,
    type: kind,
    module: row.module,
    title: row.title,
    status: row.unread ? "UNREAD" : "READ",
    createdAt: new Date(NOW - row.offsetMin * 60_000).toISOString(),
    payload: { body: row.body, nav: row.nav, detailKind, detail, actorLabel, actor, meta, cta },
  };
}

let notices: Notice[] = SEED.map(build);

// ── Store API (the swap contract) ───────────────────────────────────────────

/** All notifications, newest-first, capped at `limit`. */
export function list(limit = 50): Notice[] {
  return [...notices]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getById(id: string): Notice | null {
  return notices.find((n) => n.id === id) ?? null;
}

export function unreadCount(): number {
  return notices.filter((n) => n.status === "UNREAD").length;
}

/** Mark the given ids read. Idempotent, one-way (UNREAD→READ). Returns count changed. */
export function markRead(ids: string[]): number {
  const want = new Set(ids);
  let updated = 0;
  notices = notices.map((n) => {
    if (want.has(n.id) && n.status === "UNREAD") {
      updated += 1;
      return { ...n, status: "READ" as const };
    }
    return n;
  });
  return updated;
}

/** Mark every unread notification read. Returns count changed. */
export function markAllRead(): number {
  let updated = 0;
  notices = notices.map((n) => {
    if (n.status === "UNREAD") {
      updated += 1;
      return { ...n, status: "READ" as const };
    }
    return n;
  });
  return updated;
}
