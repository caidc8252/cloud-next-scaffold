import { describe, expect, it } from "vitest";
import { relTime, hueFor } from "./helpers";

describe("relTime", () => {
  it("returns 'just now' for timestamps within 60s", () => {
    const now = new Date(Date.now() - 30_000).toISOString();
    expect(relTime(now)).toBe("just now");
  });

  it("returns 'Xm ago' for timestamps within 1h", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns 'Xh ago' for timestamps within 24h", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns 'Xd ago' for timestamps within 30d", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(relTime(twoDaysAgo)).toBe("2d ago");
  });

  it("returns formatted date for older timestamps", () => {
    const result = relTime("2025-01-15T12:00:00Z");
    expect(result).toMatch(/Jan\s+15,\s+2025/);
  });

  it("returns empty string for null", () => {
    expect(relTime(null)).toBe("");
  });
});

describe("hueFor", () => {
  it("returns consistent hue for the same name", () => {
    expect(hueFor("Alice")).toBe(hueFor("Alice"));
  });

  it("returns a number", () => {
    expect(typeof hueFor("Bob")).toBe("number");
  });
});
