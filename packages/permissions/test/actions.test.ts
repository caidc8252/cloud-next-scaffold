import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  delete: vi.fn<(name: string) => void>(),
  get: vi.fn<(name: string) => { value: string } | undefined>(),
  set: vi.fn<(name: string, value: string, options: object) => void>(),
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_APP_NAME = "Cloud Scaffold";
  process.env.AUTH_SESSION_SECRET = "test-session-secret";
  cookieStore.delete.mockReset();
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
});

describe("session actions", () => {
  it("createSession writes the signed cookie", async () => {
    const { SESSION_COOKIE } = await import("../src/server/session.ts");
    const { createSession } = await import("../src/server/actions.ts");

    await createSession(7, 9);

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = cookieStore.set.mock.calls[0]!;
    expect(name).toBe(SESSION_COOKIE);
    expect(typeof value).toBe("string");
    expect(options).toMatchObject({
      httpOnly: true,
      maxAge: 43_200,
      path: "/",
      sameSite: "lax",
    });
  });

  it("destroySession deletes the cookie", async () => {
    const { SESSION_COOKIE } = await import("../src/server/session.ts");
    const { destroySession } = await import("../src/server/actions.ts");

    await destroySession();

    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE);
  });

  it("upgradeSession rewrites the cookie with the new entity id", async () => {
    const { createSession, upgradeSession } = await import("../src/server/actions.ts");
    const { decodeSession } = await import("../src/server/session.ts");

    await createSession(7, null);
    const [, token] = cookieStore.set.mock.calls[0]!;
    cookieStore.get.mockReturnValue({ value: token as string });

    await upgradeSession(11);

    const [, upgradedToken] = cookieStore.set.mock.calls[1]!;
    expect(decodeSession(upgradedToken as string)).toMatchObject({
      userId: 7,
      entityId: 11,
    });
  });

  it("downgradeSession clears the entity id", async () => {
    const { createSession, downgradeSession } = await import("../src/server/actions.ts");
    const { decodeSession } = await import("../src/server/session.ts");

    await createSession(7, 11);
    const [, token] = cookieStore.set.mock.calls[0]!;
    cookieStore.get.mockReturnValue({ value: token as string });

    await downgradeSession();

    const [, downgradedToken] = cookieStore.set.mock.calls[1]!;
    expect(decodeSession(downgradedToken as string)).toMatchObject({
      userId: 7,
      entityId: null,
    });
  });
});
