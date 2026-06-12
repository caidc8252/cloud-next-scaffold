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

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  // maxErrorTimes / lockDurationMinutes 是展示默认值，运行期真源是 .env 的 AUTH_PASSWORD_MAX_ERROR_TIMES / AUTH_PASSWORD_LOCK_MINUTES（见 @cloud/config getAuthConfig）；改默认值要两边同步
  maxErrorTimes: 6,
  lockDurationMinutes: 60,
  historySize: 5,
  expiryDays: 90,
};
