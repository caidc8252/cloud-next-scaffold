import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { registerDevAuthBypassSessionProviderMock } = vi.hoisted(() => ({
  registerDevAuthBypassSessionProviderMock: vi.fn(),
}));

vi.mock("@/manifest", () => ({}));
vi.mock("@/lib/dev-auth-bypass", () => ({
  registerDevAuthBypassSessionProvider: registerDevAuthBypassSessionProviderMock,
}));

const originalNextRuntime = process.env.NEXT_RUNTIME;

beforeEach(() => {
  vi.resetModules();
  registerDevAuthBypassSessionProviderMock.mockClear();
});

afterEach(() => {
  if (originalNextRuntime === undefined) {
    delete process.env.NEXT_RUNTIME;
  } else {
    process.env.NEXT_RUNTIME = originalNextRuntime;
  }
});

describe("instrumentation register", () => {
  it("does not load the Node-only dev auth provider in the Edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const { register } = await import("./instrumentation");

    await register();

    expect(registerDevAuthBypassSessionProviderMock).not.toHaveBeenCalled();
  });

  it("registers the dev auth provider in the Node.js runtime", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const { register } = await import("./instrumentation");

    await register();

    expect(registerDevAuthBypassSessionProviderMock).toHaveBeenCalledTimes(1);
  });
});

const request = { path: "/roles/42", method: "GET", headers: {} };
const context = {
  routerKind: "App Router" as const,
  routePath: "/roles/[id]",
  routeType: "render" as const,
  renderSource: "react-server-components" as const,
  revalidateReason: undefined,
  renderType: "dynamic" as const,
};

describe("onRequestError", () => {
  it("logs the digest, request path and the full error so RSC errors are traceable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("rsc-boom-marker"), { digest: "abc123digest" });
    const { onRequestError } = await import("./instrumentation");

    onRequestError(error, request, context);

    const logged = spy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("abc123digest");
    expect(logged).toContain("/roles/42");
    expect(logged).toContain("rsc-boom-marker");
    spy.mockRestore();
  });

  it("does not throw when the error has no digest", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { onRequestError } = await import("./instrumentation");

    expect(() => onRequestError(new Error("no-digest"), request, context)).not.toThrow();

    spy.mockRestore();
  });
});
