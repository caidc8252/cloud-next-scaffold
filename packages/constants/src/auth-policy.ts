// 认证/登录安全策略：跨 app 共享的固定策略常量（纯惰性值，client/server 均可 import）。
// 单一真源——原先散在 env(AUTH_PASSWORD_*) + @cloud/config/password-policy 两处、且已分裂
// （env lock=30 vs 旧 PASSWORD_POLICY=60，执行端锁 30、UI 显示 60）。此处取执行端实际值收口。

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
  maxErrorTimes: 6,
  lockDurationMinutes: 30,
  historySize: 5,
  expiryDays: 90,
};

/** 登录请求时间戳新鲜度窗口（防重放）。单位 ms。 */
export const LOGIN_TIMESTAMP_WINDOW_MS = 60_000;
