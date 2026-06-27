// apps/admin/service/account/types.ts
// account 域展示 VO（服务端 mapper 输出，client 取数即得）。字段对齐 Prisma；纯展示派生值在 mapper/UI 算、不落库。
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

// POST /api/account/mfa/enroll 返回：待激活因子的密钥 + otpauth URI。
export type EnrollData = { mfaInfoId: number; secret: string; otpauthUri: string };

// "Switch partner" 列表项 VO（partners-board 渲染、account.service.listPartners 输出）。
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

// 国家/地区选项（profile-board 国家选择器；COUNTRIES 常量的元素类型）。
export type Country = {
  code: string;
  name: string;
  dial: string;
};
