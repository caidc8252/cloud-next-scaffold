import { describe, expect, it, vi } from "vitest";
import { onRequestError } from "./instrumentation.ts";

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
  it("logs the digest, request path and the full error so RSC errors are traceable", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("rsc-boom-marker"), { digest: "abc123digest" });

    onRequestError(error, request, context);

    const logged = spy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("abc123digest");
    expect(logged).toContain("/roles/42");
    expect(logged).toContain("rsc-boom-marker");
    spy.mockRestore();
  });

  it("does not throw when the error has no digest", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => onRequestError(new Error("no-digest"), request, context)).not.toThrow();
    spy.mockRestore();
  });
});
