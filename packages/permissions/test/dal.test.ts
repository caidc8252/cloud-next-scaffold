import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
};

const redirectMock = vi.fn((url: string): never => {
  throw new Error(`__REDIRECT__:${url}`);
});

const prismaMock = {
  sysEntityContract: {
    findFirst: vi.fn(),
  },
  sysEntityUser: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  sysMenu: {
    findMany: vi.fn(),
  },
  sysPermission: {
    findMany: vi.fn(),
  },
  sysRolePermission: {
    findMany: vi.fn(),
  },
  sysUser: {
    findUnique: vi.fn(),
  },
  sysUserRole: {
    findMany: vi.fn(),
  },
};

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@cloud/db", () => ({
  prisma: prismaMock,
}));

function buildToken(userId: number, entityId: number | null) {
  const expiresAt = Date.now() + 60_000;
  const encodedPayload = Buffer.from(
    JSON.stringify({ userId, entityId, expiresAt }),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", process.env.AUTH_SESSION_SECRET ?? "")
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_APP_NAME = "Cloud Scaffold";
  process.env.AUTH_SESSION_SECRET = "test-session-secret";
  cookieStore.get.mockReset();
  redirectMock.mockClear();
  prismaMock.sysEntityContract.findFirst.mockReset();
  prismaMock.sysEntityUser.findMany.mockReset();
  prismaMock.sysEntityUser.findUnique.mockReset();
  prismaMock.sysMenu.findMany.mockReset();
  prismaMock.sysPermission.findMany.mockReset();
  prismaMock.sysRolePermission.findMany.mockReset();
  prismaMock.sysUser.findUnique.mockReset();
  prismaMock.sysUserRole.findMany.mockReset();
});

describe("getPartialSession", () => {
  it("returns null when the cookie is missing", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { getPartialSession } = await import("../src/server/dal.ts");

    expect(await getPartialSession()).toBeNull();
  });

  it("returns the lightweight user snapshot", async () => {
    cookieStore.get.mockReturnValue({ value: buildToken(1, null) });
    prismaMock.sysUser.findUnique.mockResolvedValue({
      userId: 1,
      username: "alice",
      displayName: "Alice",
      status: "ACTIVE",
    });
    const { getPartialSession } = await import("../src/server/dal.ts");

    expect(await getPartialSession()).toEqual({
      id: 1,
      username: "alice",
      displayName: "Alice",
    });
  });
});

describe("getSession", () => {
  it("returns null for a partial session token", async () => {
    cookieStore.get.mockReturnValue({ value: buildToken(1, null) });
    const { getSession } = await import("../src/server/dal.ts");

    expect(await getSession()).toBeNull();
  });

  it("hydrates a full authenticated session", async () => {
    cookieStore.get.mockReturnValue({ value: buildToken(1, 2) });
    prismaMock.sysUser.findUnique.mockResolvedValue({
      userId: 1,
      username: "alice",
      displayName: "Alice",
      email: "alice@example.com",
      status: "ACTIVE",
    });
    prismaMock.sysEntityUser.findUnique.mockResolvedValue({
      status: "ACTIVE",
      authorizingType: "NORMAL",
      entity: {
        entityId: 2,
        entityName: "Acme",
        status: "ACTIVE",
      },
    });
    prismaMock.sysEntityContract.findFirst.mockResolvedValue({
      authorizedContractDefineCode: "standard",
    });
    prismaMock.sysUserRole.findMany.mockResolvedValue([
      {
        roleId: 3,
        role: {
          roleId: 3,
          roleName: "Admin",
          roleType: "SYSTEM",
        },
      },
    ]);
    prismaMock.sysRolePermission.findMany.mockResolvedValue([
      { permissionCode: "system.user.read" },
      { permissionCode: "system.user.read" },
      { permissionCode: "system.user.write" },
    ]);
    prismaMock.sysPermission.findMany.mockResolvedValue([
      { permissionMenuId: 10 },
      { permissionMenuId: 10 },
      { permissionMenuId: 11 },
    ]);
    prismaMock.sysMenu.findMany
      .mockResolvedValueOnce([
        {
          menuId: 10,
          menuTitle: "Users",
          path: "/system/users",
          icon: "users",
          sort: 2,
          parentMenuId: 9,
        },
        {
          menuId: 11,
          menuTitle: "Roles",
          path: "/system/roles",
          icon: "shield",
          sort: 3,
          parentMenuId: 9,
        },
      ])
      .mockResolvedValueOnce([
        {
          menuId: 9,
          menuTitle: "System",
          path: null,
          icon: "settings",
          sort: 1,
          parentMenuId: null,
        },
      ]);

    const { getSession } = await import("../src/server/dal.ts");

    expect(await getSession()).toEqual({
      id: 1,
      username: "alice",
      displayName: "Alice",
      email: "alice@example.com",
      status: "ACTIVE",
      entity: {
        entityId: 2,
        entityName: "Acme",
        contractDefineCode: "standard",
      },
      roles: [
        {
          roleId: 3,
          roleName: "Admin",
          roleType: "SYSTEM",
        },
      ],
      permissions: ["system.user.read", "system.user.write"],
      menus: [
        {
          menuId: 9,
          menuTitle: "System",
          path: null,
          icon: "settings",
          sort: 1,
          parentMenuId: null,
        },
        {
          menuId: 10,
          menuTitle: "Users",
          path: "/system/users",
          icon: "users",
          sort: 2,
          parentMenuId: 9,
        },
        {
          menuId: 11,
          menuTitle: "Roles",
          path: "/system/roles",
          icon: "shield",
          sort: 3,
          parentMenuId: 9,
        },
      ],
    });
  });
});

describe("requireSession", () => {
  it("redirects to logout when the session is fully missing", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const { requireSession } = await import("../src/server/dal.ts");

    await expect(requireSession()).rejects.toThrow("__REDIRECT__:/api/auth/logout");
  });

  it("redirects to select-entity when the user still has an active entity", async () => {
    cookieStore.get.mockReturnValue({ value: buildToken(1, 2) });
    prismaMock.sysUser.findUnique.mockResolvedValue({
      userId: 1,
      username: "alice",
      displayName: "Alice",
      email: "alice@example.com",
      status: "ACTIVE",
    });
    prismaMock.sysEntityUser.findUnique.mockResolvedValue(null);
    prismaMock.sysEntityUser.findMany.mockResolvedValue([
      {
        status: "ACTIVE",
        entity: { status: "ACTIVE" },
      },
    ]);
    const { requireSession } = await import("../src/server/dal.ts");

    await expect(requireSession()).rejects.toThrow("__REDIRECT__:/select-entity");
  });

  it("redirects to locked when no active entity remains", async () => {
    cookieStore.get.mockReturnValue({ value: buildToken(1, 2) });
    prismaMock.sysUser.findUnique.mockResolvedValue({
      userId: 1,
      username: "alice",
      displayName: "Alice",
      email: "alice@example.com",
      status: "ACTIVE",
    });
    prismaMock.sysEntityUser.findUnique.mockResolvedValue(null);
    prismaMock.sysEntityUser.findMany.mockResolvedValue([
      {
        status: "INACTIVE",
        entity: { status: "ACTIVE" },
      },
    ]);
    const { requireSession } = await import("../src/server/dal.ts");

    await expect(requireSession()).rejects.toThrow("__REDIRECT__:/locked");
  });
});
