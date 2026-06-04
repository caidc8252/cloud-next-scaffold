import { describe, expect, it } from "vitest";
import {
  isAccountActive,
  isLockActive,
  isTimestampFresh,
  computeFailureUpdate,
} from "./login-checks.ts";

describe("isAccountActive", () => {
  it("only ACTIVE is active", () => {
    expect(isAccountActive("ACTIVE")).toBe(true);
    expect(isAccountActive("PENDING")).toBe(false);
    expect(isAccountActive("LOCKED")).toBe(false);
  });
});

describe("isLockActive", () => {
  const now = new Date("2026-06-04T00:00:00Z");
  it("null lock is not active", () => {
    expect(isLockActive(null, now)).toBe(false);
  });
  it("future lock is active", () => {
    expect(isLockActive(new Date("2026-06-04T00:10:00Z"), now)).toBe(true);
  });
  it("past lock is not active (expired)", () => {
    expect(isLockActive(new Date("2026-06-03T23:50:00Z"), now)).toBe(false);
  });
  it("lock expiring exactly at now is not active", () => {
    expect(isLockActive(new Date("2026-06-04T00:00:00Z"), now)).toBe(false);
  });
});

describe("isTimestampFresh", () => {
  const now = 1_700_000_000_000;
  const windowMs = 60_000;
  it("within window passes", () => {
    expect(isTimestampFresh(now - 30_000, now, windowMs)).toBe(true);
    expect(isTimestampFresh(now + 30_000, now, windowMs)).toBe(true);
  });
  it("beyond window fails", () => {
    expect(isTimestampFresh(now - 61_000, now, windowMs)).toBe(false);
  });
  it("exact window boundary is inclusive", () => {
    expect(isTimestampFresh(now - windowMs, now, windowMs)).toBe(true);
    expect(isTimestampFresh(now + windowMs, now, windowMs)).toBe(true);
  });
  it("one ms beyond the window fails", () => {
    expect(isTimestampFresh(now - windowMs - 1, now, windowMs)).toBe(false);
    expect(isTimestampFresh(now + windowMs + 1, now, windowMs)).toBe(false);
  });
});

describe("computeFailureUpdate", () => {
  const now = new Date("2026-06-04T00:00:00Z");
  it("increments and does not lock below threshold", () => {
    const r = computeFailureUpdate(2, 6, 30, now);
    expect(r.passwordErrorTimes).toBe(3);
    expect(r.passwordErrorLockExpiredTimestamp).toBeNull();
  });
  it("locks at threshold with now + lockMinutes", () => {
    const r = computeFailureUpdate(5, 6, 30, now);
    expect(r.passwordErrorTimes).toBe(6);
    expect(r.passwordErrorLockExpiredTimestamp).toEqual(new Date("2026-06-04T00:30:00Z"));
  });
  it("keeps locking and counting past threshold", () => {
    const r = computeFailureUpdate(6, 6, 30, now);
    expect(r.passwordErrorTimes).toBe(7);
    expect(r.passwordErrorLockExpiredTimestamp).toEqual(new Date("2026-06-04T00:30:00Z"));
  });
});
