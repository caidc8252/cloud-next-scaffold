import type { PasswordPolicy } from "../types";

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  maxErrorTimes: 5,
  lockDurationMinutes: 30,
  historySize: 5,
  expiryDays: 90,
};
