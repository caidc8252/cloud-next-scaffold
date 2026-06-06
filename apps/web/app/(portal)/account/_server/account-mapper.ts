import "server-only";

import type { AccountProfile } from "@/app/(portal)/account/_shared/types";

// SysUser 行 → AccountProfile VO。字段名对齐 DB（nickName/country/...）。
type ProfileRow = {
  userId: number;
  username: string;
  nickName: string;
  email: string;
  country: string | null;
  passwordChangedTimestamp: Date | null;
};

export function toAccountProfile(user: ProfileRow): AccountProfile {
  return {
    userId: user.userId,
    username: user.username,
    nickName: user.nickName,
    email: user.email,
    country: user.country,
    passwordChangedTimestamp: user.passwordChangedTimestamp?.toISOString() ?? null,
  };
}
