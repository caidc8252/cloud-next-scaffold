// Value-object types for the user "account" surface (profile, security,
// partners, activity, help). These mirror the shapes the mock store returns
// and the route handlers accept/return — when the mock is swapped for a real
// backend, the service should keep producing these same shapes.

export type Profile = {
  name: string;
  country: string; // ISO 3166-1 alpha-2
  username: string;
  email: string;
};

export type ConnectedService = {
  name: string;
  sub: string;
  on: boolean;
};

export type SecurityState = {
  // Sign-in
  magicLink: boolean;
  password: { lastChangedDaysAgo: number; expiresInDays: number };
  // Multi-factor
  smsBackup: boolean;
  authenticator: { app: string; addedLabel: string; reconfiguredAt: string | null };
  // Connected SSO / IdPs
  connectedServices: ConnectedService[];
  // Danger zone
  apiTokenCount: number;
};

export type PortalKey = "admin" | "partner" | "merchant";

// One Partner the signed-in user belongs to. Pre-derived for display: in the
// real model this is an EntityUserRelationship joined to its Entity's live
// contracts, with the destination portal derived from contract type.
export type Partner = {
  eurId: string;
  entityId: string;
  name: string;
  initial: string;
  kinds: string[]; // contract-type chips: ADMIN / ISO / ISV / MERCHANT / *-PILOT
  portalKey: PortalKey;
  portalLabel: string;
  portalTint: string; // oklch swatch for the logo tile
  current: boolean; // the portal the user is in right now
  joinedAt: string; // ISO date
  authType: "ADMIN" | "NORMAL";
  locked: boolean; // contract suspended/expired → access locked
};

export type ActivityTone = "info" | "success" | "warning";

export type ActivityItem = {
  time: string;
  icon: string;
  title: string;
  sub: string;
  tone: ActivityTone;
};

export type ActivityGroup = {
  day: string;
  items: ActivityItem[];
};

export type HelpCategory = {
  icon: string;
  name: string;
  count: number;
};

export type HelpFaq = {
  question: string;
  answer: string;
};

export type HelpContent = {
  categories: HelpCategory[];
  faqs: HelpFaq[];
};

export type Country = {
  code: string;
  name: string;
  dial: string;
};
