/** 账号级状态正常性：只有 ACTIVE 放行（PENDING/历史遗留 LOCKED 均视为不可用）。 */
export function isAccountActive(status: string): boolean {
  return status === "ACTIVE";
}

/** 刷错锁是否生效：仅看时间戳，过期（<= now）不算锁。 */
export function isLockActive(lockExpiresAt: Date | null, now: Date): boolean {
  return lockExpiresAt !== null && lockExpiresAt.getTime() > now.getTime();
}

/** 时间戳新鲜度：|now - timestamp| <= windowMs。 */
export function isTimestampFresh(timestamp: number, now: number, windowMs: number): boolean {
  return Math.abs(now - timestamp) <= windowMs;
}

export type FailureUpdate = {
  passwordErrorTimes: number;
  passwordErrorLockExpiredTimestamp: Date | null;
};

/** 密码错误时计算更新：次数 +1；达到/超过阈值则上锁到 now + lockMinutes，否则不锁。 */
export function computeFailureUpdate(
  currentErrorTimes: number,
  maxErrorTimes: number,
  lockDurationMinutes: number,
  now: Date,
): FailureUpdate {
  const passwordErrorTimes = currentErrorTimes + 1;
  const locked = passwordErrorTimes >= maxErrorTimes;
  return {
    passwordErrorTimes,
    passwordErrorLockExpiredTimestamp: locked
      ? new Date(now.getTime() + lockDurationMinutes * 60_000)
      : null,
  };
}
