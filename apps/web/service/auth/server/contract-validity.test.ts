import { describe, expect, it } from "vitest";
import {
  partnerToday,
  dateToYmd,
  isContractEffective,
  isAuthorizingWindowOpen,
} from "./contract-validity";

// 固定一个 UTC 时间点：2026-06-08T03:00:00Z
const NOW = new Date("2026-06-08T03:00:00.000Z");

describe("partnerToday", () => {
  it("returns the calendar day in the partner timezone (UTC-4 still same day here)", () => {
    expect(partnerToday("America/New_York", NOW)).toBe("2026-06-07"); // 03:00Z = 23:00 prev day in EDT
  });

  it("returns the UTC day for UTC", () => {
    expect(partnerToday("UTC", NOW)).toBe("2026-06-08");
  });

  it("falls back to UTC day on an invalid timezone", () => {
    expect(partnerToday("Not/AZone", NOW)).toBe("2026-06-08");
  });
});

describe("dateToYmd", () => {
  it("takes the UTC calendar-day part of a @db.Date", () => {
    expect(dateToYmd(new Date("2026-06-08T00:00:00.000Z"))).toBe("2026-06-08");
  });
});

describe("isContractEffective", () => {
  const today = "2026-06-08";
  it("is effective inside a closed window", () => {
    expect(isContractEffective(new Date("2026-06-01T00:00:00Z"), new Date("2026-06-30T00:00:00Z"), today)).toBe(true);
  });
  it("is not yet effective before from-date", () => {
    expect(isContractEffective(new Date("2026-06-09T00:00:00Z"), null, today)).toBe(false);
  });
  it("is expired after to-date", () => {
    expect(isContractEffective(null, new Date("2026-06-07T00:00:00Z"), today)).toBe(false);
  });
  it("treats null ends as unbounded", () => {
    expect(isContractEffective(null, null, today)).toBe(true);
  });
  it("is inclusive on both ends", () => {
    expect(isContractEffective(new Date("2026-06-08T00:00:00Z"), new Date("2026-06-08T00:00:00Z"), today)).toBe(true);
  });
});

describe("isAuthorizingWindowOpen", () => {
  it("is open inside the window", () => {
    expect(isAuthorizingWindowOpen(new Date("2026-06-01T00:00:00Z"), new Date("2026-07-01T00:00:00Z"), NOW)).toBe(true);
  });
  it("is closed before from", () => {
    expect(isAuthorizingWindowOpen(new Date("2026-06-09T00:00:00Z"), null, NOW)).toBe(false);
  });
  it("is closed after to", () => {
    expect(isAuthorizingWindowOpen(null, new Date("2026-06-07T00:00:00Z"), NOW)).toBe(false);
  });
  it("treats null ends as unbounded", () => {
    expect(isAuthorizingWindowOpen(null, null, NOW)).toBe(true);
  });
});
