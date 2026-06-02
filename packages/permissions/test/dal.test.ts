import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../src/server/session-store.ts";

// Stateful fakes: @cloud/cache (Redis), next/headers cookies, next/navigation redirect.
const { kvStore, kvMock, cookieJar, cookieStore, redirectMock } = vi.hoisted(() => {
  const kvStore = new Map<string, unknown>();
  const cookieJar = new Map<string, string>();
  return {
    kvStore,
    cookieJar,
    kvMock: {
      get: vi.fn(async (key: string) => (kvStore.has(key) ? kvStore.get(key) : null)),
      set: vi.fn(async (key: string, value: unknown, _ttl?: number) => {
        kvStore.set(key, value);
      }),
      del: vi.fn(async (key: string) => {
        kvStore.delete(key);
      }),
      expire: vi.fn(async () => {}),
    },
    cookieStore: {
      get: vi.fn((name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined)),
    },
    redirectMock: vi.fn((url: string): never => {
      throw new Error(`__REDIRECT__:${url}`);
    }),
  };
});

vi.mock("@cloud/cache", () => ({ kv: kvMock }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const fullSnapshot: Omit<Session, "loginAt" | "expireAt"> = {
  userId: 1,
  username: "alice",
  displayName: "Alice",
  email: "alice@example.com",
  currentEntityId: 2,
  currentEntity: {
    entityId: 2,
    entityName: "Acme",
    contractTypes: ["ADMIN"],
    authorizingType: "ADMIN",
    roles: [{ roleId: 3, roleName: "Admin", roleType: "GLOBAL" }],
    permissions: ["users.VIEW", "roles.VIEW"],
  },
  entities: [
    { entityId: 2, entityName: "Acme", authorizingType: "ADMIN", status: "ACTIVE", authorizingFrom: null, authorizingTo: null },
  ],
  mfaPassed: true,
};

const partialSnapshot: Omit<Session, "loginAt" | "expireAt"> = {
  ...fullSnapshot,
  currentEntityId: null,
  currentEntity: null,
};

beforeEach(() => {
  vi.resetModules();
  kvStore.clear();
  cookieJar.clear();
  kvMock.get.mockClear();
  kvMock.set.mockClear();
  kvMock.expire.mockClear();
  cookieStore.get.mockClear();
  redirectMock.mockClear();
});

async function seed(snapshot: Omit<Session, "loginAt" | "expireAt">) {
  const { sessionStore, SID_COOKIE } = await import("../src/server/session-store.ts");
  const { sid } = await sessionStore.create(snapshot);
  cookieJar.set(SID_COOKIE, sid);
  return sid;
}

describe("getPartialSession", () => {
  it("returns null when no sid cookie is present", async () => {
    const { getPartialSession } = await import("../src/server/dal.ts");
    expect(await getPartialSession()).toBeNull();
  });

  it("returns identity for any live session (incl. partial)", async () => {
    await seed(partialSnapshot);
    const { getPartialSession } = await import("../src/server/dal.ts");
    expect(await getPartialSession()).toEqual({ id: 1, username: "alice", displayName: "Alice" });
  });
});

describe("getSession", () => {
  it("returns null for a partial session (no current entity)", async () => {
    await seed(partialSnapshot);
    const { getSession } = await import("../src/server/dal.ts");
    expect(await getSession()).toBeNull();
  });

  it("projects a full snapshot into an AuthenticatedSession", async () => {
    await seed(fullSnapshot);
    const { getSession } = await import("../src/server/dal.ts");
    expect(await getSession()).toEqual({
      id: 1,
      userId: 1,
      username: "alice",
      displayName: "Alice",
      email: "alice@example.com",
      status: "ACTIVE",
      entity: { entityId: 2, entityName: "Acme", contractTypes: ["ADMIN"] },
      roles: [{ roleId: 3, roleName: "Admin", roleType: "GLOBAL" }],
      permissions: ["users.VIEW", "roles.VIEW"],
    });
  });

  it("slides the TTL on a cache hit", async () => {
    const sid = await seed(fullSnapshot);
    const { getSession } = await import("../src/server/dal.ts");
    await getSession();
    expect(kvMock.expire).toHaveBeenCalledWith(`session:${sid}`, expect.any(Number));
  });
});

describe("requireSession", () => {
  it("redirects to logout when no session exists", async () => {
    const { requireSession } = await import("../src/server/dal.ts");
    await expect(requireSession()).rejects.toThrow("__REDIRECT__:/api/auth/logout");
  });

  it("redirects to select-entity when partial with an active entity", async () => {
    await seed(partialSnapshot);
    const { requireSession } = await import("../src/server/dal.ts");
    await expect(requireSession()).rejects.toThrow("__REDIRECT__:/select-entity");
  });

  it("redirects to locked when partial with no active entity", async () => {
    await seed({
      ...partialSnapshot,
      entities: [
        { entityId: 2, entityName: "Acme", authorizingType: "NORMAL", status: "EXPIRED", authorizingFrom: null, authorizingTo: null },
      ],
    });
    const { requireSession } = await import("../src/server/dal.ts");
    await expect(requireSession()).rejects.toThrow("__REDIRECT__:/locked");
  });
});
