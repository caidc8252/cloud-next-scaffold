export type PermissionItem = {
  code: string;
  label: string;
  desc: string;
};

export type PermissionGroup = {
  menuId: string;
  menuTitle: string;
  items: PermissionItem[];
};

export type Role = {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  operatorCount: number;
  permissions: string[];
  updatedAt: string;
  updatedBy: string;
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
