import "server-only";

// 合同有效性 / 授权窗口判定。site 登录生成 session 时使用 partner 时区口径。

export function partnerToday(timezone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    console.error(`[contract-validity] invalid timezone "${timezone}", falling back to UTC`);
    return now.toISOString().slice(0, 10);
  }
}

export function dateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isContractEffective(
  effectiveFromDate: Date | null,
  effectiveToDate: Date | null,
  today: string,
): boolean {
  const from = effectiveFromDate ? dateToYmd(effectiveFromDate) : null;
  const to = effectiveToDate ? dateToYmd(effectiveToDate) : null;
  return (from === null || from <= today) && (to === null || to >= today);
}

export function isAuthorizingWindowOpen(
  from: Date | null,
  to: Date | null,
  now: Date,
): boolean {
  return (from === null || from <= now) && (to === null || to >= now);
}
