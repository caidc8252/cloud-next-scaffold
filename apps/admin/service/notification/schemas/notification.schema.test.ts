import { describe, expect, it } from "vitest";
import { listNoticesQuerySchema, markReadBodySchema, createNoticeInputSchema } from "./notification.schema";

describe("listNoticesQuerySchema", () => {
  it("applies defaults", () => {
    expect(listNoticesQuerySchema.parse({})).toMatchObject({ page: 1, limit: 25 });
  });
  it("coerces and clamps", () => {
    const r = listNoticesQuerySchema.parse({ page: "2", limit: "50", status: "UNREAD", module: "ticket", q: "x" });
    expect(r).toMatchObject({ page: 2, limit: 50, status: "UNREAD", module: "ticket", q: "x" });
  });
  it("rejects limit over 100", () => {
    expect(listNoticesQuerySchema.safeParse({ limit: "1000" }).success).toBe(false);
  });
});

describe("markReadBodySchema", () => {
  it("accepts ids", () => { expect(markReadBodySchema.parse({ ids: ["a"] })).toEqual({ ids: ["a"] }); });
  it("accepts all:true", () => { expect(markReadBodySchema.parse({ all: true })).toEqual({ all: true }); });
  it("rejects empty", () => { expect(markReadBodySchema.safeParse({}).success).toBe(false); });
  it("rejects empty ids", () => { expect(markReadBodySchema.safeParse({ ids: [] }).success).toBe(false); });
});

describe("createNoticeInputSchema", () => {
  it("requires summary in payload", () => {
    expect(createNoticeInputSchema.safeParse({ userId: 1, noticeType: "t.x", title: "T", payload: {} }).success).toBe(false);
  });
  it("accepts minimal", () => {
    const r = createNoticeInputSchema.parse({ userId: 1, noticeType: "t.x", title: "T", payload: { summary: "s" } });
    expect(r.payload.summary).toBe("s");
  });
});
