import { beforeEach, describe, expect, it, vi } from "vitest";

// Stateful in-memory fakes for @cloud/cache and next/headers cookies.
const { kvStore, kvMock, cookieJar, cookieStore } = vi.hoisted(() => {
  const kvStore = new Map<string, unknown>();
  const cookieJar = new Map<string, string>();
  return {
    kvStore,
    cookieJar,
    kvMock: {
      get: vi.fn(async (key: string) => (kvStore.has(key) ? kvStore.get(key) : null)),
      set: vi.fn(async (key: string, value: unknown, ttlSeconds?: number) => {
        void ttlSeconds;
        kvStore.set(key, value);
      }),
      del: vi.fn(async (key: string) => {
        kvStore.delete(key);
      }),
      expire: vi.fn(async () => {}),
    },
    cookieStore: {
      get: vi.fn((name: string) =>
        cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined,
      ),
      set: vi.fn((name: string, value: string, options?: object) => {
        void options;
        cookieJar.set(name, value);
      }),
      delete: vi.fn((name: string) => {
        cookieJar.delete(name);
      }),
    },
  };
});

vi.mock("@cloud/cache", () => ({ kv: kvMock }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

import {
  consumeSessionHandoffToken,
  createSession,
  createSessionHandoffToken,
  destroySession,
  updateSession,
} from "../src/server/actions.ts";
import { sessionStore, SID_COOKIE, type Session } from "../src/server/session-store.ts";

const snapshot: Omit<Session, "loginAt" | "expireAt"> = {
  userId: 7,
  username: "alice",
  displayName: "Alice",
  email: "alice@example.com",
  currentPartnerId: 9,
  partnerName: "Acme",
  contractTypes: ["ADMIN"],
  authorizingType: "ADMIN",
  roles: [],
  permissions: ["roles.VIEW"],
  partners: [
    {
      partnerId: 9,
      partnerName: "Acme",
      authorizingType: "ADMIN",
      status: "ACTIVE",
      authorizingFrom: null,
      authorizingTo: null,
    },
  ],
  mfaPassed: true,
};

beforeEach(() => {
  delete process.env.SESSION_COOKIE_DOMAIN;
  kvStore.clear();
  cookieJar.clear();
  for (const fn of [
    kvMock.get,
    kvMock.set,
    kvMock.del,
    kvMock.expire,
    cookieStore.get,
    cookieStore.set,
    cookieStore.delete,
  ]) {
    fn.mockClear();
  }
});

describe("session actions", () => {
  it("createSession stores the snapshot in Redis and sets the sid cookie", async () => {
    await createSession(snapshot);

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = cookieStore.set.mock.calls[0]!;
    expect(name).toBe(SID_COOKIE);
    expect(typeof value).toBe("string");
    expect(options).toMatchObject({ httpOnly: true, maxAge: 43_200, path: "/", sameSite: "lax" });

    const stored = await sessionStore.read(value as string);
    expect(stored).toMatchObject({ userId: 7, currentPartnerId: 9 });
  });

  it("shares the sid cookie with sibling subdomains when configured", async () => {
    process.env.SESSION_COOKIE_DOMAIN = ".example.com";

    await createSession(snapshot);

    expect(cookieStore.set.mock.calls[0]![2]).toMatchObject({
      domain: ".example.com",
    });
  });

  it("creates and consumes a one-time session handoff token", async () => {
    const sid = await createSession(snapshot);
    const token = await createSessionHandoffToken(sid);

    expect(typeof token).toBe("string");

    cookieJar.clear();
    cookieStore.set.mockClear();

    await expect(consumeSessionHandoffToken(token!)).resolves.toBe(true);
    expect(cookieStore.set).toHaveBeenCalledWith(
      SID_COOKIE,
      sid,
      expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
    );

    cookieStore.set.mockClear();
    await expect(consumeSessionHandoffToken(token!)).resolves.toBe(false);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it("does not create a handoff token without a current sid", async () => {
    await expect(createSessionHandoffToken()).resolves.toBeNull();
  });

  it("destroySession removes the Redis session and clears the cookie", async () => {
    await createSession(snapshot);
    const sid = cookieStore.set.mock.calls[0]![1] as string;

    await destroySession();

    expect(cookieStore.set).toHaveBeenLastCalledWith(
      SID_COOKIE,
      "",
      expect.objectContaining({ maxAge: 0, path: "/" }),
    );
    expect(await sessionStore.read(sid)).toBeNull();
  });

  it("updateSession overwrites the current sid and preserves loginAt", async () => {
    await createSession({
      ...snapshot,
      currentPartnerId: null,
      partnerName: null,
      contractTypes: [],
      authorizingType: null,
      roles: [],
      permissions: [],
    });
    const sid = cookieStore.set.mock.calls[0]![1] as string;
    const before = await sessionStore.read(sid);

    await updateSession(snapshot);

    const after = await sessionStore.read(sid);
    expect(after?.currentPartnerId).toBe(9);
    expect(after?.permissions).toEqual(["roles.VIEW"]);
    expect(after?.loginAt).toBe(before?.loginAt);
  });

  it("updateSession is a no-op without a sid cookie", async () => {
    await updateSession(snapshot);
    expect(kvMock.set).not.toHaveBeenCalled();
  });
});
