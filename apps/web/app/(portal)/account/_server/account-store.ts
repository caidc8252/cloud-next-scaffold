import "server-only";

import type {
  ActivityGroup,
  HelpContent,
  Partner,
  Profile,
  SecurityState,
} from "@/app/(portal)/account/_shared/types";

// ─────────────────────────────────────────────────────────────────────────
// In-memory mock store for the "account" surface.
//
// This is the single source of truth the account route handlers and the
// account page RSCs both read/write, so a mutation (e.g. a profile rename)
// shows up everywhere that reads it — the profile page AND the sidebar user
// card — and survives navigation. It resets on server restart, which is the
// expected behaviour for a mock.
//
// To swap to a real backend later, replace the bodies of these functions with
// calls to a real service/repository; the route handlers and RSCs that call
// them do not change.
// ─────────────────────────────────────────────────────────────────────────

// Seed mirrors the prototype's CURRENT_USER. Identity (username) is provisioned
// by IT/SSO; name + country are user-editable; email changes via a verified flow.
let profile: Profile = {
  name: "Jordan Diaz",
  country: "US",
  username: "jordan.diaz",
  email: "admin@toms",
};

let security: SecurityState = {
  magicLink: false,
  password: { lastChangedDaysAgo: 41, expiresInDays: 49 },
  smsBackup: true,
  authenticator: { app: "1Password", addedLabel: "added Feb 14, 2025 · used 3 hours ago", reconfiguredAt: null },
  connectedServices: [
    { name: "Okta SSO", sub: "carbon.okta.com · enforced", on: true },
    { name: "Google Workspace", sub: "admin@carbon · scopes: profile, email", on: true },
    { name: "Microsoft Entra", sub: "Not connected", on: false },
  ],
  apiTokenCount: 4,
};

// Pre-derived partner list for the signed-in user (prototype user u-2). In the
// real model each row is an EntityUserRelationship joined to its Entity's live
// contracts; the destination portal is derived from the contract type. Ordering:
// current portal first, then by join date desc, locked last.
const PARTNERS: Partner[] = [
  {
    eurId: "eur-npt-2", entityId: "e-npt", name: "NPT", initial: "N",
    kinds: ["ADMIN"], portalKey: "admin", portalLabel: "Admin Console", portalTint: "oklch(40% 0.14 262)",
    current: true, joinedAt: "2024-06-12T09:00:00Z", authType: "NORMAL", locked: false,
  },
  {
    eurId: "eur-u2-c015", entityId: "c-015", name: "Wildflower Goods", initial: "W",
    kinds: ["ISO-PILOT"], portalKey: "partner", portalLabel: "Partner Portal", portalTint: "oklch(52% 0.13 200)",
    current: false, joinedAt: "2026-04-10T10:02:00Z", authType: "ADMIN", locked: false,
  },
  {
    eurId: "eur-u2-c007", entityId: "c-007", name: "Bluefin Market", initial: "B",
    kinds: ["MERCHANT"], portalKey: "merchant", portalLabel: "Merchant Portal", portalTint: "oklch(56% 0.13 152)",
    current: false, joinedAt: "2026-02-20T14:30:00Z", authType: "NORMAL", locked: false,
  },
  {
    eurId: "eur-u2-c006", entityId: "c-006", name: "Loomis Industrial", initial: "L",
    kinds: ["ISV"], portalKey: "partner", portalLabel: "Partner Portal", portalTint: "oklch(52% 0.13 200)",
    current: false, joinedAt: "2026-01-15T09:48:00Z", authType: "NORMAL", locked: false,
  },
  {
    eurId: "eur-u2-c001", entityId: "c-001", name: "Northwind Commerce", initial: "N",
    kinds: ["ISO", "ISV"], portalKey: "partner", portalLabel: "Partner Portal", portalTint: "oklch(52% 0.13 200)",
    current: false, joinedAt: "2025-09-05T11:20:00Z", authType: "ADMIN", locked: false,
  },
  {
    eurId: "eur-u2-c005", entityId: "c-005", name: "Coastline Hospitality", initial: "C",
    kinds: ["ISO"], portalKey: "partner", portalLabel: "Partner Portal", portalTint: "oklch(52% 0.13 200)",
    current: false, joinedAt: "2024-12-10T13:18:00Z", authType: "ADMIN", locked: true,
  },
];

const ACTIVITY: ActivityGroup[] = [
  {
    day: "Today",
    items: [
      { time: "14:22", icon: "shield", title: "Signed in from MacBook Pro · San Francisco, CA", sub: "IP 73.241.0.18 · trusted device", tone: "info" },
      { time: "13:08", icon: "edit", title: 'Updated role "ISO Operator (Tier 2)"', sub: "Granted contract.view to 4 contracts · Customers affected: 28", tone: "success" },
      { time: "11:51", icon: "file", title: "Signed contract — ISV Master Services Agreement", sub: "Customer: Greenline Tech · 2 signers remaining", tone: "success" },
      { time: "09:42", icon: "user", title: 'Created customer "Bayfront Studios"', sub: "Assigned ISV contract · KYC: pending review", tone: "info" },
    ],
  },
  {
    day: "Yesterday",
    items: [
      { time: "17:14", icon: "shield", title: "Approved KYC for Northpoint Industries", sub: "Risk score 32/100 · documents 4/4", tone: "success" },
      { time: "14:02", icon: "trash", title: "Revoked operator access — j.chen@partner.io", sub: "Reason: terminated employment · effective immediately", tone: "warning" },
      { time: "10:38", icon: "package", title: "Issued 12 POS terminals", sub: "Order #ORD-2451 · shipped to Acme Foods", tone: "info" },
    ],
  },
  {
    day: "Apr 28",
    items: [
      { time: "15:30", icon: "edit", title: "Updated organization branding", sub: "New logo and primary color", tone: "info" },
      { time: "11:12", icon: "logout", title: "Signed out all sessions", sub: "Triggered manually from security settings", tone: "warning" },
    ],
  },
];

const HELP: HelpContent = {
  categories: [
    { icon: "home", name: "Getting started", count: 12 },
    { icon: "users", name: "Customers & KYC", count: 18 },
    { icon: "file", name: "Contracts", count: 24 },
    { icon: "package", name: "Orders", count: 9 },
    { icon: "shield", name: "Roles & permissions", count: 15 },
    { icon: "settings", name: "Workspace settings", count: 7 },
  ],
  faqs: [
    { question: "How do I move a customer between ISV and ISO contracts?", answer: 'Open the customer detail, switch to the Contracts tab, then use "Reassign contract" from the row menu.' },
    { question: "Why is a permission greyed out in the role editor?", answer: "The role is inheriting a deny from a parent contract. Override it from the contract scope panel above." },
    { question: "Where do I find audit logs for a single operator?", answer: "Audit log → filter by Actor, then enter the operator email. Export to CSV is available." },
    { question: "Can I sign in with my hardware key only?", answer: "Yes — add a FIDO2 key under Account & security, then disable other factors. Admin policy may require a backup factor." },
  ],
};

// ─── Profile ───────────────────────────────────────────────────────────────
export function getProfile(): Profile {
  return { ...profile };
}

// Apply user-editable fields plus verified identity changes (email/username).
export function updateProfile(patch: Partial<Profile>): Profile {
  profile = { ...profile, ...patch };
  return { ...profile };
}

// ─── Security ────────────────────────────────────────────────────────────
export function getSecurityState(): SecurityState {
  return structuredClone(security);
}

export function updateSecurityToggles(patch: { magicLink?: boolean; smsBackup?: boolean }): SecurityState {
  security = {
    ...security,
    magicLink: patch.magicLink ?? security.magicLink,
    smsBackup: patch.smsBackup ?? security.smsBackup,
  };
  return structuredClone(security);
}

export function recordPasswordChange(): SecurityState {
  security = { ...security, password: { lastChangedDaysAgo: 0, expiresInDays: 90 } };
  return structuredClone(security);
}

export function reconfigureAuthenticator(): SecurityState {
  security = {
    ...security,
    authenticator: { ...security.authenticator, reconfiguredAt: "just now" },
  };
  return structuredClone(security);
}

export function revokeApiTokens(): SecurityState {
  security = { ...security, apiTokenCount: 0 };
  return structuredClone(security);
}

// ─── Read-only demo data ───────────────────────────────────────────────────
export function getPartners(): Partner[] {
  return PARTNERS.map((p) => ({ ...p }));
}

export function getActivity(): ActivityGroup[] {
  return structuredClone(ACTIVITY);
}

export function getHelpContent(): HelpContent {
  return structuredClone(HELP);
}
