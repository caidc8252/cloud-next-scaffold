import "server-only";
import type {
  Account,
  Company,
  DashboardKpi,
  IdpAccount,
  Invitation,
  LoginResult,
  MfaProfile,
  ProviderId,
  SsoTenant,
} from "./types";

// =====================================================================
// THE single shared mock store. Every handler reads/writes this module
// singleton, so a mutation (register / accept-invite) shows up wherever
// it's read and survives navigation within the running server process.
// Shaped like the anticipated real API — swapping to a real service is a
// handler-body change, not a reshape.
// =====================================================================

// ── Seed reference data (read-only) ──────────────────────────────────
const COMPANIES: Company[] = [
  { id: "brightpos", name: "BrightPOS Solutions", contract: "ISV", initials: "BP", accent: "#2a4cae" },
  { id: "acmepay", name: "Acme Pay", contract: "ISO", initials: "AP", accent: "#0b5cff" },
  { id: "verakiosk", name: "Vera Kiosk", contract: "CUSTOM", initials: "VK", accent: "#7b3fe4" },
];

const SSO_DOMAINS: SsoTenant[] = [
  { domain: "acmepay.com", partner: "Acme Pay", slug: "acme-pay", idp: "okta", initials: "AP", accent: "#0b5cff", contract: "ACTIVE" },
  { domain: "northpeak.io", partner: "NorthPeak Holdings", slug: "northpeak", idp: "entra", initials: "NP", accent: "#0a7f5b", contract: "SUSPENDED" },
  { domain: "verakiosk.com", partner: "Vera Kiosk", slug: "vera", idp: "google", initials: "VK", accent: "#7b3fe4", contract: "ACTIVE" },
];

const IDP_ACCOUNTS: Record<string, IdpAccount[]> = {
  google: [
    { name: "Jordan Diaz", email: "jordan.diaz@brightpos.com", sub: "g-103547821095" },
    { name: "J. Diaz (personal)", email: "jordan.diaz@gmail.com", sub: "g-220948170032" },
  ],
  apple: [{ name: "Jordan Diaz", email: "jordan.diaz@brightpos.com", sub: "a-001932.7fa2" }],
  microsoft: [{ name: "Jordan Diaz", email: "jordan.diaz@brightpos.com", sub: "m-9d2e1f77-aad" }],
};

const DASHBOARD_KPIS: DashboardKpi[] = [
  { key: "activeTerminals", value: "4,182", delta: "+38" },
  { key: "fleetUptime", value: "99.94%", delta: "30d" },
  { key: "pendingUpdates", value: "126", delta: "12 stores" },
  { key: "openAlerts", value: "7", delta: "2 critical" },
];

// The invitation an invitee lands on. `roles` are kept as stable codes; the
// UI localizes their labels.
const INVITATION: Invitation = {
  token: "inv_8f2c1a",
  partner: "BrightPOS Solutions",
  contract: "ISV",
  invitedBy: "admin@brightpos.com",
  email: "kai.tanaka@brightpos.com",
  invitedAt: Date.now() - 1000 * 60 * 60 * 26,
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 6,
  roles: ["fleetOperator", "firmwarePublisher"],
};

// ── Runtime mutable state (the part that "behaves") ──────────────────
interface PendingLogin {
  account: Account;
  companies: Company[];
  mfa?: MfaProfile;
  mfaTries: number;
}
// Persist across hot reloads in dev via globalThis so a navigation mid-flow
// doesn't lose the pending login handle.
const g = globalThis as unknown as { __pepPending?: Map<string, PendingLogin> };
const pendingLogins: Map<string, PendingLogin> = (g.__pepPending ??= new Map());

const token = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const deriveName = (email: string) =>
  (email.split("@")[0] || "operator")
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// ── Reads ────────────────────────────────────────────────────────────
export const getCompanies = () => COMPANIES;
export const getSsoDomains = () => SSO_DOMAINS;
export const resolveSsoTenant = (email: string): SsoTenant | null => {
  const domain = email.includes("@") ? email.split("@")[1]?.toLowerCase().trim() : "";
  return SSO_DOMAINS.find((t) => t.domain === domain) ?? null;
};
export const listIdpAccounts = (provider: ProviderId | string): IdpAccount[] =>
  IDP_ACCOUNTS[provider] ?? [];
export const getInvitation = (inviteToken: string): Invitation | null =>
  inviteToken === INVITATION.token ? INVITATION : null;
export const getDashboardKpis = (): DashboardKpi[] => DASHBOARD_KPIS;

// ── Scenario engine: companies + MFA a login resolves to ─────────────
// Tweaks are gone, so scenarios are deterministic by email/password.
function profileFor(email: string): { mfa?: MfaProfile; companies: Company[] } {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local === "nocompany") return { companies: [] };
  if (local === "solo") return { companies: [COMPANIES[0]] };
  if (local === "sms")
    return { mfa: { method: "sms", hint: "+1 ••• ••• 4408" }, companies: COMPANIES.slice(0, 2) };
  // default operator: TOTP MFA + access to all workspaces (exercises chooser)
  return { mfa: { method: "totp", hint: "authenticator app" }, companies: COMPANIES.slice(0, 3) };
}

/** Stage-1: verify password. Returns a discriminated result; "badpw" is the
 *  only path the caller maps to an inline 401 (every other state is a screen). */
export function verifyPassword(email: string, password: string): LoginResult {
  const e = email.trim();
  const local = e.split("@")[0]?.toLowerCase() ?? "";
  if (password === "wrongpw") return { status: "badpw" };
  if (local === "locked") return { status: "blocked", blocked: "locked" };
  if (local === "ratelimited" || local === "rate") return { status: "blocked", blocked: "ratelimit" };

  const account: Account = { name: deriveName(e), email: e, sub: token("pwd") };
  const { mfa, companies } = profileFor(e);
  if (companies.length === 0) return { status: "nocompany", account };

  const loginToken = token("login");
  pendingLogins.set(loginToken, { account, companies, mfa, mfaTries: 0 });

  if (mfa) return { status: "mfa", mfaToken: loginToken, mfa, account };
  if (companies.length > 1) return { status: "company", mfaToken: loginToken, companies, account };
  return finishLogin(loginToken, companies[0]);
}

/** OIDC / enterprise SSO: the IdP owns MFA, so resolve straight to company or
 *  session. Returns a pending handle when a company choice is needed. */
export function startOidcLogin(account: Account): LoginResult {
  const { companies } = profileFor(account.email);
  if (companies.length === 0) return { status: "nocompany", account };
  const loginToken = token("login");
  pendingLogins.set(loginToken, { account, companies, mfaTries: 0 });
  if (companies.length > 1) return { status: "company", mfaToken: loginToken, companies, account };
  return finishLogin(loginToken, companies[0]);
}

export interface MfaVerifyResult {
  status: "ok" | "company" | "wrong" | "blocked";
  triesLeft?: number;
  companies?: Company[];
  loginToken?: string;
  account?: Account;
  company?: Company;
}

/** Stage-2: verify the 6-digit code. Demo: any code works EXCEPT "000000";
 *  5 wrong tries escalates to a verification lockout. */
export function verifyMfa(loginToken: string, code: string): MfaVerifyResult {
  const pending = pendingLogins.get(loginToken);
  if (!pending) return { status: "blocked" };
  if (code === "000000") {
    pending.mfaTries += 1;
    if (pending.mfaTries >= 5) {
      pendingLogins.delete(loginToken);
      return { status: "blocked" };
    }
    return { status: "wrong", triesLeft: 5 - pending.mfaTries };
  }
  if (pending.companies.length > 1)
    return { status: "company", loginToken, companies: pending.companies };
  const company = pending.companies[0];
  pendingLogins.delete(loginToken);
  return { status: "ok", account: { ...pending.account, company } };
}

/** Resolve a pending login to a concrete signed-in account + chosen company. */
export function finishLogin(loginToken: string, company?: Company): LoginResult {
  const pending = pendingLogins.get(loginToken);
  if (!pending) return { status: "blocked" };
  pendingLogins.delete(loginToken);
  const chosen = company ?? pending.companies[0];
  return { status: "ok", account: { ...pending.account, company: chosen } };
}

export function selectCompany(loginToken: string, companyId: string): Account | null {
  const pending = pendingLogins.get(loginToken);
  if (!pending) return null;
  const company = pending.companies.find((c) => c.id === companyId) ?? pending.companies[0];
  pendingLogins.delete(loginToken);
  return { ...pending.account, company };
}

export { deriveName, token as mockToken };
