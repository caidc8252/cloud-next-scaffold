import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory fake for @cloud/cache so the store can be tested without Redis.
// vi.hoisted keeps the mock defined before vi.mock's hoisted factory runs.
const { store, kvMock } = vi.hoisted(() => {
  const store = new Map<string, unknown>();
  return {
    store,
    kvMock: {
      get: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
      set: vi.fn(async (key: string, value: unknown, _ttl?: number) => {
        store.set(key, value);
      }),
      del: vi.fn(async (key: string) => {
        store.delete(key);
      }),
      expire: vi.fn(async () => {}),
    },
  };
});

vi.mock("@cloud/cache", () => ({ kv: kvMock }));

import { sessionStore, SESSION_TTL_SECONDS, type Session } from "../src/server/session-store.ts";

const snapshot: Omit<Session, "loginAt" | "expireAt"> = {
  userId: 7,
  username: "alice",
  displayName: "Alice",
  email: "alice@example.com",
  currentEntityId: 9,
  currentEntity: {
    entityId: 9,
    entityName: "Acme",
    contractTypes: ["ADMIN"],
    authorizingType: "ADMIN",
    roles: [{ roleId: 1, roleName: "Administrator", roleType: "GLOBAL" }],
    permissions: ["roles.VIEW", "users.VIEW"],
  },
  entities: [
    { entityId: 9, entityName: "Acme", authorizingType: "ADMIN", status: "ACTIVE", authorizingFrom: null, authorizingTo: null },
    { entityId: 10, entityName: "Beta", authorizingType: "NORMAL", status: "ACTIVE", authorizingFrom: null, authorizingTo: null },
  ],
  mfaPassed: true,
};

beforeEach(() => {
  store.clear();
  kvMock.get.mockClear();
  kvMock.set.mockClear();
  kvMock.del.mockClear();
  kvMock.expire.mockClear();
});

describe("sessionStore", () => {
  it("create() persists the snapshot with TTL, stamping loginAt/expireAt, and returns a fresh sid", async () => {
    const { sid } = await sessionStore.create(snapshot);

    expect(sid).toBeTruthy();
    expect(kvMock.set).toHaveBeenCalledTimes(1);
    const [key, value, ttl] = kvMock.set.mock.calls[0]!;
    expect(key).toBe(`session:${sid}`);
    expect(ttl).toBe(SESSION_TTL_SECONDS);
    const stored = value as Session;
    expect(stored).toMatchObject({ userId: 7, currentEntityId: 9, mfaPassed: true });
    expect(stored.currentEntity).toMatchObject({ permissions: ["roles.VIEW", "users.VIEW"] });
    expect(stored.entities).toHaveLength(2);
    expect(typeof stored.loginAt).toBe("number");
    expect(stored.expireAt).toBeGreaterThan(stored.loginAt);
  });

  it("create() generates a distinct sid each call", async () => {
    const a = await sessionStore.create(snapshot);
    const b = await sessionStore.create(snapshot);
    expect(a.sid).not.toBe(b.sid);
  });

  it("read() returns the stored session, or null when absent", async () => {
    const { sid } = await sessionStore.create(snapshot);
    const read = await sessionStore.read(sid);
    expect(read).toMatchObject({ userId: 7, currentEntity: { permissions: ["roles.VIEW", "users.VIEW"] } });
    expect(await sessionStore.read("missing")).toBeNull();
  });

  it("update() upgrades a partial session and preserves loginAt", async () => {
    const { sid } = await sessionStore.create({
      ...snapshot,
      currentEntityId: null,
      currentEntity: null,
    });
    const partial = (await sessionStore.read(sid))!;
    expect(partial.currentEntityId).toBeNull();
    expect(partial.currentEntity).toBeNull();

    await sessionStore.update(sid, { ...snapshot, loginAt: partial.loginAt });
    const full = (await sessionStore.read(sid))!;
    expect(full.currentEntityId).toBe(9);
    expect(full.currentEntity?.permissions).toEqual(["roles.VIEW", "users.VIEW"]);
    expect(full.loginAt).toBe(partial.loginAt);
  });

  it("touch() refreshes the TTL on the session key", async () => {
    const { sid } = await sessionStore.create(snapshot);
    await sessionStore.touch(sid);
    expect(kvMock.expire).toHaveBeenCalledWith(`session:${sid}`, SESSION_TTL_SECONDS);
  });

  it("destroy() removes the session", async () => {
    const { sid } = await sessionStore.create(snapshot);
    await sessionStore.destroy(sid);
    expect(kvMock.del).toHaveBeenCalledWith(`session:${sid}`);
    expect(await sessionStore.read(sid)).toBeNull();
  });
});
