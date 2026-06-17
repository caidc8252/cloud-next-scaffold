import { describe, expect, it } from "vitest";
import { REDIS_NS } from "./namespace.ts";

// 防撞 + 域规范的兜底：新增 key 写错域 / 撞名 / 用了大写，立刻红。
describe("REDIS_NS", () => {
  const entries = Object.entries(REDIS_NS).flatMap(([domain, keys]) =>
    Object.values(keys as Record<string, string>).map((value) => ({ domain, value })),
  );

  it("every namespace value is globally unique", () => {
    const values = entries.map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("every value is lowercase snake_case, colon-delimited, and starts with its domain", () => {
    for (const { domain, value } of entries) {
      // 段内 snake_case（小写 + 下划线，禁连字符）、`:` 分隔域与名
      expect(value).toMatch(/^[a-z][a-z0-9_]*(:[a-z][a-z0-9_]*)+$/);
      expect(value.startsWith(`${domain}:`)).toBe(true);
    }
  });
});
