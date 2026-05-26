import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = {
  get: vi.fn<(key: string) => Promise<string | null>>(),
  set: vi.fn<(...args: unknown[]) => Promise<"OK">>(),
  del: vi.fn<(key: string) => Promise<number>>(),
  expire: vi.fn<(key: string, ttl: number) => Promise<number>>(),
  quit: vi.fn<() => Promise<"OK">>(),
};

vi.mock("ioredis", () => {
  function Redis(this: object) {
    return redisMock;
  }
  return { default: Redis };
});

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_APP_NAME = "Cloud Scaffold";
  process.env.DATABASE_URL =
    "postgresql://cloud:cloud_dev_password@localhost:5433/cloud_frontend?schema=public";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.AUTH_SESSION_SECRET = "test-session-secret";
  redisMock.get.mockReset();
  redisMock.set.mockReset();
  redisMock.del.mockReset();
  redisMock.expire.mockReset();
  redisMock.quit.mockReset().mockResolvedValue("OK");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("@cloud/cache kv", () => {
  it("get returns null when key missing", async () => {
    redisMock.get.mockResolvedValueOnce(null);
    const { kv } = await import("../src/index.ts");
    expect(await kv.get("missing")).toBeNull();
    expect(redisMock.get).toHaveBeenCalledWith("missing");
  });

  it("get parses JSON value", async () => {
    redisMock.get.mockResolvedValueOnce(JSON.stringify({ a: 1, b: "x" }));
    const { kv } = await import("../src/index.ts");
    expect(await kv.get<{ a: number; b: string }>("k")).toEqual({ a: 1, b: "x" });
  });

  it("set without ttl uses plain SET", async () => {
    redisMock.set.mockResolvedValueOnce("OK");
    const { kv } = await import("../src/index.ts");
    await kv.set("k", { hello: "world" });
    expect(redisMock.set).toHaveBeenCalledWith("k", JSON.stringify({ hello: "world" }));
  });

  it("set with ttl uses EX option", async () => {
    redisMock.set.mockResolvedValueOnce("OK");
    const { kv } = await import("../src/index.ts");
    await kv.set("k", { v: 1 }, 1800);
    expect(redisMock.set).toHaveBeenCalledWith("k", JSON.stringify({ v: 1 }), "EX", 1800);
  });

  it("del / expire forward to ioredis", async () => {
    redisMock.del.mockResolvedValueOnce(1);
    redisMock.expire.mockResolvedValueOnce(1);
    const { kv } = await import("../src/index.ts");
    await kv.del("k");
    await kv.expire("k", 60);
    expect(redisMock.del).toHaveBeenCalledWith("k");
    expect(redisMock.expire).toHaveBeenCalledWith("k", 60);
  });
});

describe("@cloud/cache client singleton", () => {
  it("getRedis returns same instance on repeated calls", async () => {
    const { getRedis } = await import("../src/index.ts");
    const a = getRedis();
    const b = getRedis();
    expect(a).toBe(b);
  });

  it("closeRedis quits and allows a new client afterwards", async () => {
    const { getRedis, closeRedis } = await import("../src/index.ts");
    getRedis();
    await closeRedis();
    expect(redisMock.quit).toHaveBeenCalledTimes(1);
    getRedis(); // does not throw; constructs a fresh client
  });
});
