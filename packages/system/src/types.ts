export type PasswordPolicy = {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
  maxErrorTimes: number;
  lockDurationMinutes: number;
  historySize: number;
  expiryDays: number;
};

export type PermissionEntry = {
  code: string;
  menuId: string;
  label: string;
  desc: string;
};

export type MenuNode = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  contractDefineCode: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  operatorCount: number;
  roleType: "global";
  contractDefineCode: string;
  permissions: string[];
  updatedAt: string;
  updatedBy: string;
};

export type PasswordResetRequest = {
  id: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  consumedAt: string | null;
  status: "pending" | "consumed" | "expired" | "superseded";
};

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
  passwordChangeTimes: number;
  passwordErrorLockExpiredTimestamp: number | null;
  passwordUpdatedAt: string | null;
  remark: string;
  createdAt: string;
  updatedAt: string;
  authorizingType: string;
  roleIds: string[];
  passwordHistory: Array<{ hashId: string; changedAt: string }>;
  // Pending invite fields
  invitedAt?: string;
  invitedBy?: string;
  inviteExpiresAt?: string;
  inviteToken?: string;
  inviteEmail?: string;
  resendCount?: number;
  passwordResetRequests?: PasswordResetRequest[];
};
