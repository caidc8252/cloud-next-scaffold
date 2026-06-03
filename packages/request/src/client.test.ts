import { afterEach, describe, expect, it, vi } from "vitest";
import { request, RequestError, setUnauthorizedHandler } from "./client.ts";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  setUnauthorizedHandler(undefined);
  vi.unstubAllGlobals();
});

describe("request client unauthorized hook", () => {
  it("invokes the registered handler with the RequestError on 401, and still throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ code: "unauthenticated", message: "Unauthorized.", traceId: "t1" }, 401),
      ),
    );
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await expect(request.get("/api/whatever")).rejects.toBeInstanceOf(RequestError);

    expect(handler).toHaveBeenCalledTimes(1);
    const err = handler.mock.calls[0]![0] as RequestError;
    expect(err).toBeInstanceOf(RequestError);
    expect(err.status).toBe(401);
    expect(err.body?.code).toBe("unauthenticated");
  });

  it("does not invoke the handler on non-401 errors (400 / 403 / 500)", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    for (const status of [400, 403, 500]) {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => jsonResponse({ code: "x", message: "m", traceId: "t" }, status)),
      );
      await expect(request.get("/api/x")).rejects.toBeInstanceOf(RequestError);
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not invoke the handler on 2xx / 204 success", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ code: "OK", message: "success", data: { ok: true }, traceId: "t" }, 200),
      ),
    );
    await expect(request.get("/api/ok")).resolves.toBeTruthy();

    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    await expect(request.delete("/api/ok")).resolves.toBeUndefined();

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not throw on a 401 when no handler is registered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({ code: "unauthenticated", message: "Unauthorized.", traceId: "t" }, 401),
      ),
    );

    await expect(request.get("/api/x")).rejects.toBeInstanceOf(RequestError);
  });
});
