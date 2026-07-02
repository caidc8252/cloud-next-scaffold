import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequestError } from "@cloud/request/client";
import { ERR_UNAUTHORIZED } from "@cloud/request/error-codes";
import {
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_NOT_AUTHENTICATED,
} from "@/modules/identity/auth/error/auth.error-codes";

function unauthorized(code: string | undefined): RequestError {
  return new RequestError(
    "unauthorized",
    401,
    code === undefined ? undefined : { code, message: "m", traceId: "t" },
  );
}

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // 模块级 `redirecting` 锁需每个用例重置，故重新加载模块。
  vi.resetModules();
  replace = vi.fn();
  vi.stubGlobal("window", { location: { replace } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadHandler() {
  const mod = await import("./session-expiry.ts");
  return mod.handleUnauthorized;
}

describe("handleUnauthorized", () => {
  it.each([["unauthenticated"], [ERR_UNAUTHORIZED], [ERR_AUTH_NOT_AUTHENTICATED]])(
    "redirects to logout when the code (%s) is a session-expiry code",
    async (code) => {
      const handleUnauthorized = await loadHandler();
      handleUnauthorized(unauthorized(code));
      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).toHaveBeenCalledWith("/api/auth/logout");
    },
  );

  it("does not redirect on a login credential error", async () => {
    const handleUnauthorized = await loadHandler();
    handleUnauthorized(unauthorized(ERR_AUTH_INVALID_CREDENTIALS));
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not redirect when the error body / code is missing", async () => {
    const handleUnauthorized = await loadHandler();
    handleUnauthorized(unauthorized(undefined));
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects only once across concurrent session-expiry 401s", async () => {
    const handleUnauthorized = await loadHandler();
    handleUnauthorized(unauthorized("unauthenticated"));
    handleUnauthorized(unauthorized("unauthenticated"));
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
