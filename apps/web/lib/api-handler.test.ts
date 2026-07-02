import { describe, expect, it, vi } from "vitest";
import { AuthzError } from "@cloud/permissions/server";
import { BusinessError, MiddlewareError } from "@cloud/request";
import {
  createdResponse,
  noContentResponse,
  successResponse,
  type Pager,
} from "@cloud/request/server";
import { ERR_INTERNAL, ERR_MW_CACHE, ERR_UNAUTHORIZED } from "@cloud/request/error-codes";
import { ERR_ROLE_DELETE_ASSIGNED } from "@/modules/system/roles/error/roles.error-codes";
import { handleApiError, withApiHandler } from "./api-handler";

async function readBody(response: Response) {
  return (await response.json()) as {
    code: string;
    message: string;
    traceId: string;
    data?: unknown;
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    nextCursor?: string | null;
    hasNextPage?: boolean;
  };
}

describe("api-handler", () => {
  it("maps unauthenticated errors to 401", async () => {
    const response = handleApiError(new AuthzError(401, "unauthenticated"));
    const body = await readBody(response);

    expect(response.status).toBe(401);
    // 401 统一映射到注册表内的 ERR_UNAUTHORIZED，文案随 locale 本地化（无 ambient locale 时为英文基底）。
    expect(body.code).toBe(ERR_UNAUTHORIZED);
    expect(body.message).toBe("Authentication is required or your session has expired.");
    expect(body.traceId).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/);
  });

  it("maps forbidden errors to 403", async () => {
    const response = handleApiError(new AuthzError(403, "forbidden"));
    const body = await readBody(response);

    expect(response.status).toBe(403);
    expect(body.code).toBe("forbidden");
    expect(body.message).toBe("Forbidden.");
  });

  it("allows custom error mappers to handle domain errors", async () => {
    const response = handleApiError(new Error("domain"), {
      onError: () =>
        Response.json({ code: "custom", message: "Handled", traceId: "BIZ-test" }, { status: 422 }),
    });
    const body = await readBody(response);

    expect(response.status).toBe(422);
    expect(body.code).toBe("custom");
  });

  it("maps a thrown BusinessError to its localized 40x body", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleApiError(new BusinessError(ERR_ROLE_DELETE_ASSIGNED, 409));
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.code).toBe(ERR_ROLE_DELETE_ASSIGNED);
    expect(body.message).toBe("Roles with assigned users cannot be deleted.");
    spy.mockRestore();
  });

  it("maps a thrown MiddlewareError to a masked 503", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = handleApiError(new MiddlewareError(ERR_MW_CACHE));
    const body = await readBody(response);

    expect(response.status).toBe(503);
    expect(body.code).toBe(ERR_MW_CACHE);
    expect(body.message).toBe("The service is temporarily unavailable. Please try again later.");
    spy.mockRestore();
  });

  it("maps common Prisma errors without exposing raw database details", async () => {
    const response = handleApiError({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      clientVersion: "7.0.0",
      meta: { target: ["email"] },
    });
    const body = await readBody(response);

    expect(response.status).toBe(409);
    expect(body.code).toBe("database.unique_conflict");
    expect(body.message).toBe("A record with the same unique value already exists.");
  });

  it("returns internal errors for unknown exceptions", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = handleApiError(new Error("raw secret"));
    const body = await readBody(response);

    expect(response.status).toBe(500);
    expect(body.code).toBe(ERR_INTERNAL);
    expect(body.message).toBe("Internal server error.");

    spy.mockRestore();
  });

  it("wraps route handlers", async () => {
    const handler = withApiHandler(async () => {
      throw new AuthzError(403, "forbidden");
    });

    const response = await handler();

    expect(response.status).toBe(403);
  });

  it("returns the success envelope with trace id", async () => {
    const response = successResponse({ ok: true });
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      code: "OK",
      message: "success",
      data: { ok: true },
    });
    expect(body.traceId).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/);
  });

  it("flattens pagination fields beside data for paged responses", async () => {
    const pager: Pager = {
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      nextCursor: "next-cursor",
      hasNextPage: true,
    };
    const response = successResponse(["a", "b"], pager);
    const body = await readBody(response);

    expect(body.data).toEqual(["a", "b"]);
    expect(body).toMatchObject({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      nextCursor: "next-cursor",
      hasNextPage: true,
    });
    expect("pager" in body).toBe(false);
    expect(body.code).toBe("OK");
    expect(body.message).toBe("success");
  });

  it("returns the success envelope for created responses", async () => {
    const response = createdResponse({ id: 1 });
    const body = await readBody(response);

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      code: "OK",
      message: "success",
      data: { id: 1 },
    });
    expect(body.traceId).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/);
  });

  it("keeps no content responses empty for DELETE-style handlers", async () => {
    const response = noContentResponse();

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
