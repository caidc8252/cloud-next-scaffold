// Shared view types for the PEP portal mock. These are deliberately shaped
// like an anticipated real API so the mock→real swap is a handler-body change,
// not a reshape. No `server-only` here — schemas/components import these too.

export type ProviderId = "google" | "apple" | "microsoft" | "okta" | "entra";

/** A workspace a signed-in operator can enter. One login may map to several. */
export interface Company {
  id: string;
  name: string;
  /** Contract entitlement tier shown as a chip (ISO / ISV / CUSTOM). */
  contract: string;
  initials: string;
  /** Brand accent (data-driven runtime color, not a token). */
  accent: string;
}

/** Second-factor descriptor resolved after credentials verify. */
export interface MfaProfile {
  method: "totp" | "sms";
  /** e.g. "authenticator app" or a masked phone number. */
  hint: string;
}

/** Email-domain → enterprise IdP routing entry. */
export interface SsoTenant {
  domain: string;
  partner: string;
  slug: string;
  idp: ProviderId;
  initials: string;
  accent: string;
  contract: "ACTIVE" | "SUSPENDED";
}

/** An account surfaced by a third-party IdP's account chooser. */
export interface IdpAccount {
  name: string;
  email: string;
  sub: string;
}

/** The signed-in identity carried in the mock session cookie. */
export interface Account {
  name: string;
  email: string;
  sub?: string;
  company?: Company;
}

/** Invitation an invitee lands on from their email. */
export interface Invitation {
  token: string;
  partner: string;
  contract: string;
  invitedBy: string;
  email: string;
  invitedAt: number;
  expiresAt: number;
  roles: string[];
}

/** Why a sign-in attempt is blocked. */
export type AuthBlockType = "locked" | "ratelimit" | "mfa";

/** A single dashboard KPI value (label comes from i18n, value/delta are data). */
export interface DashboardKpi {
  key: string;
  value: string;
  delta: string;
}

/** Result of stage-1 password verification. */
export interface LoginResult {
  status: "ok" | "mfa" | "company" | "nocompany" | "blocked" | "badpw";
  blocked?: AuthBlockType;
  mfaToken?: string;
  mfa?: MfaProfile;
  /** When status === "company": the choices to pick from. */
  companies?: Company[];
  /** When status === "ok": the chosen single company (auto-selected). */
  account?: Account;
  redirectTo?: string;
}
