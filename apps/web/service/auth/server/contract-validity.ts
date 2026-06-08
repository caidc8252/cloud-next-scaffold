import "server-only";

// 合同有效性 / 授权窗口判定的纯函数。session-snapshot 与 partner-choices 共用，便于单测。

/** partner 时区下的当天日历日，格式 "YYYY-MM-DD"。非法时区兜底 UTC 并记日志。 */
export function partnerToday(timezone: string, now: Date): string {
  try {
    // en-CA 把日期格式化成 YYYY-MM-DD
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

/** @db.Date 取其日历日部分（DB 以 UTC 午夜存）。 */
export function dateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 合同在 partner 当天是否生效（两端闭区间，null 端视为不限）。 */
export function isContractEffective(
  effectiveFromDate: Date | null,
  effectiveToDate: Date | null,
  today: string,
): boolean {
  const from = effectiveFromDate ? dateToYmd(effectiveFromDate) : null;
  const to = effectiveToDate ? dateToYmd(effectiveToDate) : null;
  return (from === null || from <= today) && (to === null || to >= today);
}

/** 授权窗口当前是否打开（两端闭区间，null 端视为不限）。 */
export function isAuthorizingWindowOpen(from: Date | null, to: Date | null, now: Date): boolean {
  return (from === null || from <= now) && (to === null || to >= now);
}
