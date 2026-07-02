import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getConfigMock,
  headersMock,
  registerSessionFallbackProviderMock,
  buildDevAuthBypassSessionMock,
} = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  headersMock: vi.fn(),
  registerSessionFallbackProviderMock: vi.fn(),
  buildDevAuthBypassSessionMock: vi.fn(),
}));

vi.mock("@cloud/config", () => ({ getConfig: getConfigMock }));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@cloud/permissions/server", () => ({
  registerSessionFallbackProvider: registerSessionFallbackProviderMock,
}));
vi.mock("@/modules/identity/auth/server/auth.public", () => ({
  buildDevAuthBypassSession: buildDevAuthBypassSessionMock,
}));

const session = {
  userId: 1,
  displayName: "Admin",
  email: "admin@newlandnpt.com",
  currentPartyId: 1,
  partyName: "Platform",
  contractTypes: ["ADMIN"],
  authorizingType: "ADMIN",
  roles: [],
  permissions: ["system.users.create"],
  partners: [],
  loginAt: 1000,
  expireAt: 2000,
  mfaPassed: true,
};

function makeHeaders(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

function mockConfig(overrides: Record<string, unknown> = {}) {
  getConfigMock.mockReturnValue({
    NODE_ENV: "development",
    CI: false,
    DEV_AUTH_BYPASS: false,
    DEV_AUTH_BYPASS_EMAIL: null,
    ...overrides,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockConfig();
  headersMock.mockResolvedValue(makeHeaders({ host: "localhost:3000" }));
  buildDevAuthBypassSessionMock.mockResolvedValue(session);
});

describe("registerDevAuthBypassSessionProvider", () => {
  it("does not register the fallback provider unless DEV_AUTH_BYPASS is enabled", async () => {
    const { registerDevAuthBypassSessionProvider } = await import("./dev-auth-bypass");

    registerDevAuthBypassSessionProvider();

    expect(registerSessionFallbackProviderMock).not.toHaveBeenCalled();
  });

  it("does not register the fallback provider in production or CI", async () => {
    mockConfig({ DEV_AUTH_BYPASS: true, NODE_ENV: "production" });
    const { registerDevAuthBypassSessionProvider } = await import("./dev-auth-bypass");

    registerDevAuthBypassSessionProvider();
    expect(registerSessionFallbackProviderMock).not.toHaveBeenCalled();

    mockConfig({ DEV_AUTH_BYPASS: true, CI: true });
    registerDevAuthBypassSessionProvider();
    expect(registerSessionFallbackProviderMock).not.toHaveBeenCalled();
  });

  it("registers the local dev auth fallback provider when explicitly enabled", async () => {
    mockConfig({ DEV_AUTH_BYPASS: true });
    const { registerDevAuthBypassSessionProvider, createDevAuthBypassSession } =
      await import("./dev-auth-bypass");

    registerDevAuthBypassSessionProvider();

    expect(registerSessionFallbackProviderMock).toHaveBeenCalledWith(createDevAuthBypassSession);
  });
});

describe("zero-injection entry shape", () => {
  it("does not expose an HTTP auth-bypass route or token bootstrap path", () => {
    const root = process.cwd();
    const routePath = path.join(root, "apps/web/app/api/auth/auth-bypass/route.ts");
    const globalSetup = readFileSync(path.join(root, "e2e/global-setup.ts"), "utf8");

    expect(existsSync(routePath)).toBe(false);
    expect(globalSetup).not.toContain("/api/auth/auth-bypass");
    expect(globalSetup).not.toContain("NEXT_AUTH_BYPASS_");
  });
});

describe("createDevAuthBypassSession", () => {
  it("does nothing unless DEV_AUTH_BYPASS is explicitly enabled", async () => {
    const { createDevAuthBypassSession } = await import("./dev-auth-bypass");

    await expect(createDevAuthBypassSession()).resolves.toBeNull();

    expect(buildDevAuthBypassSessionMock).not.toHaveBeenCalled();
  });

  it("refuses to run in production or CI even when the switch is set", async () => {
    mockConfig({ DEV_AUTH_BYPASS: true, NODE_ENV: "production" });
    const { createDevAuthBypassSession } = await import("./dev-auth-bypass");

    await expect(createDevAuthBypassSession()).resolves.toBeNull();

    mockConfig({ DEV_AUTH_BYPASS: true, CI: true });
    await expect(createDevAuthBypassSession()).resolves.toBeNull();
    expect(buildDevAuthBypassSessionMock).not.toHaveBeenCalled();
  });

  it("refuses public forwarded hosts", async () => {
    mockConfig({ DEV_AUTH_BYPASS: true });
    headersMock.mockResolvedValue(
      makeHeaders({ host: "localhost:3000", "x-forwarded-host": "app.example.com" }),
    );
    const { createDevAuthBypassSession } = await import("./dev-auth-bypass");

    await expect(createDevAuthBypassSession()).resolves.toBeNull();

    expect(buildDevAuthBypassSessionMock).not.toHaveBeenCalled();
  });

  it("builds a DB-derived session for the seed admin on a local dev host", async () => {
    mockConfig({ DEV_AUTH_BYPASS: true });
    const { createDevAuthBypassSession } = await import("./dev-auth-bypass");

    await expect(createDevAuthBypassSession()).resolves.toBe(session);

    expect(buildDevAuthBypassSessionMock).toHaveBeenCalledWith("admin@newlandnpt.com");
  });

  it("can use an explicit local bypass email without reading auth-bypass config", async () => {
    mockConfig({ DEV_AUTH_BYPASS: true, DEV_AUTH_BYPASS_EMAIL: "operator@example.com" });
    const { createDevAuthBypassSession } = await import("./dev-auth-bypass");

    await expect(createDevAuthBypassSession()).resolves.toBe(session);

    expect(buildDevAuthBypassSessionMock).toHaveBeenCalledWith("operator@example.com");
  });
});
