export function isAccountActive(status: string): boolean {
  return status === "ACTIVE";
}

export function isLockActive(lockExpiresAt: Date | null, now: Date): boolean {
  return lockExpiresAt !== null && lockExpiresAt.getTime() > now.getTime();
}

export function isTimestampFresh(timestamp: number, now: number, windowMs: number): boolean {
  return Math.abs(now - timestamp) <= windowMs;
}

export type FailureUpdate = {
  passwordErrorTimes: number;
  passwordErrorLockExpiredTimestamp: Date | null;
};

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
