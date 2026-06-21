// apps/admin/service/users/types.ts
// 用户域展示 VO（服务端 mapper 输出，client 取数即得）。含待消费邀请的可选字段。
export type User = {
  id: string;
  loginName: string;
  displayName: string;
  email: string;
  country: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  lastLoginAt: string | null;
  passwordChangedTimestamp: number;
  passwordErrorTimes: number;
  passwordErrorLockExpiredTimestamp: number | null;
  remark: string;
  createdAt: string;
  updatedAt: string;
  authorizingType: string;
  roleIds: string[];
  // Pending invite fields
  invitedAt?: string;
  invitedBy?: string;
  inviteExpiresAt?: string;
  inviteToken?: string;
  inviteEmail?: string;
  resendCount?: number;
};
