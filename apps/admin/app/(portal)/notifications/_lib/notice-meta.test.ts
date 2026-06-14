import { describe, expect, it } from "vitest";
import { moduleOf } from "./notice-meta";

describe("moduleOf", () => {
  it("derives module from noticeType prefix", () => {
    expect(moduleOf("ticket.assigned")).toBe("ticket");
    expect(moduleOf("account.passwordReset")).toBe("account");
  });

  it("falls back to default", () => {
    expect(moduleOf(null)).toBe("default");
    expect(moduleOf("weird")).toBe("default");
    expect(moduleOf("unknown.x")).toBe("default");
  });

  it("derives all known prefixes", () => {
    expect(moduleOf("customer.created")).toBe("customer");
    expect(moduleOf("app.installed")).toBe("app");
    expect(moduleOf("order.placed")).toBe("order");
  });
});
