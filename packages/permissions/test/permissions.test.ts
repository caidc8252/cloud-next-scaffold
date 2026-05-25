import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../src/server/session.ts";

const getSessionMock = vi.fn<() => Promise<Session | null>>();
const redirectMock = vi.fn((url: string): never => {
  throw new Error(`__REDIRECT__:${url}`);
});

vi.mock("../src/server/dal.ts", () => ({
  getSession: getSessionMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("server permissions", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();
    redirectMock.mockClear();
  });

  describe("hasPermissions", () => {
    it("passes when the check is empty", async () => {
      const { hasPermissions } = await import("../src/server/permissions.ts");

      expect(hasPermissions([], {})).toBe(true);
      expect(hasPermissions(["a"], {})).toBe(true);
    });

    it("requires every permission in all", async () => {
      const { hasPermissions } = await import("../src/server/permissions.ts");

      expect(hasPermissions(["a", "b"], { all: ["a", "b"] })).toBe(true);
      expect(hasPermissions(["a"], { all: ["a", "b"] })).toBe(false);
    });

    it("requires at least one permission in any", async () => {
      const { hasPermissions } = await import("../src/server/permissions.ts");

      expect(hasPermissions(["b"], { any: ["a", "b"] })).toBe(true);
      expect(hasPermissions(["c"], { any: ["a", "b"] })).toBe(false);
      expect(hasPermissions([], { any: [] })).toBe(true);
    });

    it("requires both all and any when both are provided", async () => {
      const { hasPermissions } = await import("../src/server/permissions.ts");

      expect(hasPermissions(["a", "b"], { all: ["a"], any: ["b", "c"] })).toBe(true);
      expect(hasPermissions(["a"], { all: ["a"], any: ["b", "c"] })).toBe(false);
    });
  });

  describe("assertPermissions", () => {
    it("throws unauthenticated when the session is missing", async () => {
      getSessionMock.mockResolvedValue(null);
      const { assertPermissions } = await import("../src/server/permissions.ts");

      await expect(assertPermissions({ all: ["users.VIEW"] })).rejects.toEqual(
        expect.objectContaining({
          name: "AuthzError",
          status: 401,
          code: "unauthenticated",
        }),
      );
    });

    it("throws forbidden with missing permissions when the session lacks access", async () => {
      getSessionMock.mockResolvedValue({
        id: 1,
        username: "alice",
        displayName: "Alice",
        email: "alice@example.com",
        status: "ACTIVE",
        entity: {
          entityId: 1,
          entityName: "Platform",
          contractDefineCode: "ADMIN",
        },
        roles: [],
        permissions: ["users.VIEW"],
        menus: [],
      });
      const { assertPermissions } = await import("../src/server/permissions.ts");

      await expect(
        assertPermissions({ all: ["users.VIEW", "users.UPD"], any: ["roles.VIEW", "roles.ADD"] }),
      ).rejects.toEqual(
        expect.objectContaining({
          name: "AuthzError",
          status: 403,
          code: "forbidden",
          missing: ["users.UPD", "roles.VIEW", "roles.ADD"],
        }),
      );
    });

    it("returns the session when all permission checks pass", async () => {
      const session: Session = {
        id: 1,
        username: "alice",
        displayName: "Alice",
        email: "alice@example.com",
        status: "ACTIVE",
        entity: {
          entityId: 1,
          entityName: "Platform",
          contractDefineCode: "ADMIN",
        },
        roles: [],
        permissions: ["users.VIEW", "users.UPD"],
        menus: [],
      };
      getSessionMock.mockResolvedValue(session);
      const { assertPermissions } = await import("../src/server/permissions.ts");

      await expect(assertPermissions({ all: ["users.VIEW"], any: ["users.UPD"] })).resolves.toBe(session);
    });
  });

  describe("requirePermissions", () => {
    it("redirects to logout when the session is missing", async () => {
      getSessionMock.mockResolvedValue(null);
      const { requirePermissions } = await import("../src/server/permissions.ts");

      await expect(requirePermissions({ all: ["users.VIEW"] })).rejects.toThrow(
        "__REDIRECT__:/api/auth/logout",
      );
    });

    it("redirects to /403 when the session lacks permission", async () => {
      getSessionMock.mockResolvedValue({
        id: 1,
        username: "alice",
        displayName: "Alice",
        email: "alice@example.com",
        status: "ACTIVE",
        entity: {
          entityId: 1,
          entityName: "Platform",
          contractDefineCode: "ADMIN",
        },
        roles: [],
        permissions: ["users.VIEW"],
        menus: [],
      });
      const { requirePermissions } = await import("../src/server/permissions.ts");

      await expect(requirePermissions({ all: ["users.UPD"] })).rejects.toThrow("__REDIRECT__:/403");
    });
  });
});
