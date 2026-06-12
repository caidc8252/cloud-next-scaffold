import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger, enrichTrace, getTraceId, maskEmail, newTraceId, runWithTrace } from "./index.ts";

const log = createLogger("test");
const savedLevel = process.env.LOG_LEVEL;

function lastJson(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  return JSON.parse(spy.mock.calls.at(-1)![0] as string);
}

beforeEach(() => {
  process.env.LOG_LEVEL = "debug";
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (savedLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = savedLevel;
});

describe("newTraceId", () => {
  it("has no prefix and is time-sortable + unique", () => {
    const a = newTraceId();
    const b = newTraceId();
    expect(a).toMatch(/^[0-9a-z]+-[0-9a-f]{8}$/);
    expect(a).not.toBe(b);
  });
});

describe("trace context", () => {
  it("returns undefined traceId outside a context", () => {
    expect(getTraceId()).toBeUndefined();
  });

  it("carries the traceId and increments seq per line within runWithTrace", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    runWithTrace({ traceId: "fixed-id", method: "POST", path: "/api/x" }, () => {
      expect(getTraceId()).toBe("fixed-id");
      log.info("first");
      log.info("second");
    });
    const calls = spy.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(calls[0]).toMatchObject({ traceId: "fixed-id", seq: 1, method: "POST", path: "/api/x", msg: "first", scope: "test" });
    expect(calls[1]).toMatchObject({ traceId: "fixed-id", seq: 2, msg: "second" });
  });

  it("enrichTrace merges fields into subsequent lines", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    runWithTrace({}, () => {
      enrichTrace({ userId: 5, partyId: 42 });
      log.info("after enrich");
    });
    expect(lastJson(spy)).toMatchObject({ userId: 5, partyId: 42 });
  });
});

describe("level gating + shape", () => {
  it("emits structured JSON with time/level/scope/msg", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    log.info("hi", { a: 1 });
    const line = lastJson(spy);
    expect(line).toMatchObject({ level: "info", scope: "test", msg: "hi", a: 1 });
    expect(typeof line.time).toBe("string");
  });

  it("suppresses info when LOG_LEVEL=warn but still warns", () => {
    process.env.LOG_LEVEL = "warn";
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.info("nope");
    log.warn("yep");
    expect(info).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("serializes Error context with name/message/stack", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    log.error("failed", { err: new Error("boom-marker") });
    const line = lastJson(spy) as { err: { stack: string } };
    expect(line.err.stack).toContain("boom-marker");
  });

  it("does not throw when context contains BigInt", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(() => log.info("big", { amount: 10n })).not.toThrow();
    expect(lastJson(spy)).toMatchObject({ amount: "10" });
  });

  it("does not throw when context contains circular objects", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const obj: Record<string, unknown> = { name: "root" };
    obj.self = obj;

    expect(() => log.info("circular", { obj })).not.toThrow();
    expect(lastJson(spy)).toMatchObject({ obj: { name: "root", self: "[Circular]" } });
  });
});

describe("maskEmail", () => {
  it("keeps first char + domain, *** for malformed", () => {
    expect(maskEmail("alice@x.com")).toBe("a***@x.com");
    expect(maskEmail("noat")).toBe("***");
  });
});
