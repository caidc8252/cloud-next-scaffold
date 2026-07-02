import { describe, expect, it } from "vitest";
import { AppError, BusinessError, MiddlewareError } from "./errors.ts";

describe("BusinessError", () => {
  it("defaults to status 400 and exposes the code", () => {
    const error = new BusinessError("10001");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("10001");
    expect(error.status).toBe(400);
    expect(error.params).toBeUndefined();
  });

  it("accepts an explicit status and i18n params", () => {
    const error = new BusinessError("10001", 409, { count: 3 });
    expect(error.status).toBe(409);
    expect(error.params).toEqual({ count: 3 });
  });

  it("allows 423 Locked for lock semantics (e.g. MFA lockout)", () => {
    const error = new BusinessError("1000E", 423);
    expect(error.status).toBe(423);
  });
});

describe("MiddlewareError", () => {
  it("is a 503 AppError carrying the middleware code", () => {
    const error = new MiddlewareError("F0002");
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("F0002");
    expect(error.status).toBe(503);
  });
});
