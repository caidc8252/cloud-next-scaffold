import { describe, expect, it } from "vitest";
import menuTree from "./menu-tree.ts";

describe("menu-tree", () => {
  it("declares the directory roots (frozen, no parent)", () => {
    expect(Object.isFrozen(menuTree)).toBe(true);
    expect(menuTree).toHaveLength(2);
    for (const node of menuTree) expect(node.parentMenuCode).toBeNull();
    expect(menuTree.map((n) => n.menuCode)).toEqual(["platform.main", "system"]);
  });
});
