// Value-object types for the user "account" surface (profile, security/MFA,
// partners). Field names mirror the Prisma model fields (see
// docs/nextjs/portal/admin/user-panel/domain.md). Purely presentational values
// with no column (e.g. password-expiry days, isCurrent, locked) are derived in
// the mapper/UI, not stored.

export type AccountProfile = {
  userId: number;
  username: string; // SysUser.username
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
  partnerUserId: number; // SysPartnerUser.partnerUserId
  partnerId: number;
  partnerName: string; // SysPartner.partnerName
  authorizingType: "ADMIN" | "NORMAL"; // SysPartnerUser.authorizingType
  authorizingTimestamp: string | null; // ISO
  status: string; // SysPartnerUser.status (ACTIVE | LOCKED | ...)
  locked: boolean; // derived: status !== "ACTIVE"
  contractTypes: string[]; // SysPartnerContract.authorizedContractType[]
  isCurrent: boolean; // partnerId === session.currentPartnerId
};

export type Country = {
  code: string;
  name: string;
  dial: string;
};
