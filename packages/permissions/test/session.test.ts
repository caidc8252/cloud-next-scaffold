import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_APP_NAME = "Cloud Scaffold";
  process.env.AUTH_SESSION_SECRET = "test-session-secret";
});

describe("encodeSession / decodeSession", () => {
  it("round-trips a valid payload", async () => {
    const { decodeSession, encodeSession } = await import("../src/server/session.ts");
    const token = encodeSession({
      userId: 1,
      entityId: 2,
      expiresAt: Date.now() + 60_000,
    });

    expect(decodeSession(token)).toEqual({
      userId: 1,
      entityId: 2,
      expiresAt: expect.any(Number),
    });
  });

  it("returns null for a tampered signature", async () => {
    const { decodeSession, encodeSession } = await import("../src/server/session.ts");
    const token = encodeSession({
      userId: 1,
      entityId: 2,
      expiresAt: Date.now() + 60_000,
    });

    expect(decodeSession(`${token}x`)).toBeNull();
  });

  it("returns null for an expired payload", async () => {
    const { decodeSession, encodeSession } = await import("../src/server/session.ts");
    const token = encodeSession({
      userId: 1,
      entityId: null,
      expiresAt: Date.now() - 1,
    });

    expect(decodeSession(token)).toBeNull();
  });
});
