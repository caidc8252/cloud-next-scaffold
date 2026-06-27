import { describe, it, expect } from "vitest";
import { applyGrant, computeLocked } from "./require-chain";
import type { PermissionItem } from "@/app/(dashboard)/system/_shared/types";

const items: PermissionItem[] = [
  { code: "m.view", label: "", desc: "", require: null },
  { code: "m.add", label: "", desc: "", require: "m.view" },
  { code: "m.edit", label: "", desc: "", require: "m.add" },
];

describe("require-chain", () => {
  it("granting a leaf also grants its require ancestors (transitively)", () => {
    expect(new Set(applyGrant(items, [], "m.edit", true))).toEqual(new Set(["m.edit", "m.add", "m.view"]));
  });

  it("granting a middle code grants only up to the root", () => {
    expect(new Set(applyGrant(items, [], "m.add", true))).toEqual(new Set(["m.add", "m.view"]));
  });

  it("revoking the root revokes its dependents (transitively)", () => {
    expect(new Set(applyGrant(items, ["m.view", "m.add", "m.edit"], "m.view", false))).toEqual(new Set([]));
  });

  it("revoking a middle code revokes only downstream dependents", () => {
    expect(new Set(applyGrant(items, ["m.view", "m.add", "m.edit"], "m.add", false))).toEqual(new Set(["m.view"]));
  });

  it("locked = ancestors required by some granted descendant", () => {
    expect(computeLocked(items, ["m.add"])).toEqual(new Set(["m.view"]));
    expect(computeLocked(items, ["m.view"])).toEqual(new Set([]));
    expect(computeLocked(items, ["m.edit"])).toEqual(new Set(["m.add", "m.view"]));
  });
});
