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
