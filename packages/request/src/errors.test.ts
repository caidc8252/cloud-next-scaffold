import { describe, expect, it } from "vitest";
import { AppError, BusinessError, MiddlewareError } from "./errors.ts";

describe("BusinessError", () => {
  it("defaults to status 400 and exposes the code", () => {
    const error = new BusinessError("102004");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("102004");
    expect(error.status).toBe(400);
    expect(error.params).toBeUndefined();
  });

  it("accepts an explicit status and i18n params", () => {
    const error = new BusinessError("102004", 409, { count: 3 });
    expect(error.status).toBe(409);
    expect(error.params).toEqual({ count: 3 });
  });
});

describe("MiddlewareError", () => {
  it("is a 503 AppError carrying the middleware code", () => {
    const error = new MiddlewareError("190002");
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("190002");
    expect(error.status).toBe(503);
  });
});
