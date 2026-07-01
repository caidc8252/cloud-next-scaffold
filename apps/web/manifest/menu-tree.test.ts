import { describe, expect, it } from "vitest";
import menuTree from "./menu-tree.ts";

describe("menu-tree", () => {
  it("declares the system directory root (frozen, no parent)", () => {
    expect(Object.isFrozen(menuTree)).toBe(true);
    expect(menuTree).toHaveLength(1);
    expect(menuTree[0]!.menuCode).toBe("system");
    expect(menuTree[0]!.parentMenuCode).toBeNull();
  });
});
