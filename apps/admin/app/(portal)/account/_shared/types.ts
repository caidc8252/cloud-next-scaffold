// Value-object types for the user "account" surface (profile, security/MFA,
// partners). Field names mirror the Prisma model fields (see
// docs/nextjs/portal/admin/user-panel/domain.md). Purely presentational values
// with no column (e.g. password-expiry days, isCurrent, locked) are derived in
// the mapper/UI, not stored.

export type AccountProfile = {
  userId: number;
  nickName: string; // SysUser.nickName
  email: string; // SysUser.email
  country: string | null; // SysUser.country
  passwordChangedTimestamp: string | null; // ISO; UI derives "expires in N days"
};

export type MfaStatus = "NONE" | "PENDING" | "ACTIVE";

export type AccountSecurity = {
  mfaEnable: boolean; // SysUser.mfaEnable
  mfaStatus: MfaStatus; // derived from SysMfaInfo rows
  passwordChangedTimestamp: string | null;
  passwordExpiryDays: number; // PASSWORD_POLICY.expiryDays
};

export type AccountPartner = {
  partyUserId: number; // SysPartyUser.partyUserId
  partyId: number;
  partyName: string; // SysParty.partyName
  authorizingType: "ADMIN" | "NORMAL"; // SysPartyUser.authorizingType
  authorizingTimestamp: string | null; // ISO
  status: string; // SysPartyUser.status (ACTIVE | LOCKED | ...)
  locked: boolean; // derived: status !== "ACTIVE"
  contractTypes: string[]; // SysPartyContract.authorizedContractType[]
  isCurrent: boolean; // partyId === session.currentPartyId
};

export type Country = {
  code: string;
  name: string;
  dial: string;
};
