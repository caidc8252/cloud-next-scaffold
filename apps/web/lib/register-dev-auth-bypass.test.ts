import { describe, expect, it, vi } from "vitest";

const { registerDevAuthBypassSessionProviderMock } = vi.hoisted(() => ({
  registerDevAuthBypassSessionProviderMock: vi.fn(),
}));

vi.mock("./dev-auth-bypass", () => ({
  registerDevAuthBypassSessionProvider: registerDevAuthBypassSessionProviderMock,
}));

describe("register-dev-auth-bypass", () => {
  it("registers the local dev auth provider as an import side effect", async () => {
    await import("./register-dev-auth-bypass");

    expect(registerDevAuthBypassSessionProviderMock).toHaveBeenCalledTimes(1);
  });
});
