import { describe, expect, it } from "vitest";
import { parseRoleIds, normalizeRoleIds, extractRoleIds } from "./role-codes";

describe("parseRoleIds", () => {
  it("parses string ids to deduped, ascending numbers", () => {
    expect(parseRoleIds(["3", "1", "3", "2"])).toEqual([1, 2, 3]);
  });

  it("drops non-finite / non-positive values and returns [] for non-arrays", () => {
    expect(parseRoleIds(["1", "abc", null, 2, 0, -3])).toEqual([1, 2]);
    expect(parseRoleIds(undefined)).toEqual([]);
  });
});

describe("normalizeRoleIds", () => {
  it("dedupes and sorts ascending", () => {
    expect(normalizeRoleIds([3, 1, 3, 2])).toEqual([1, 2, 3]);
  });

  it("returns [] for an empty list", () => {
    expect(normalizeRoleIds([])).toEqual([]);
  });
});

describe("extractRoleIds", () => {
  it("reads roleId out of the roles JSONB list as deduped string ids", () => {
    expect(extractRoleIds([{ roleId: 7 }, { roleId: 3 }, { roleId: 7 }])).toEqual(["7", "3"]);
  });

  it("returns [] for non-array / malformed entries", () => {
    expect(extractRoleIds(null)).toEqual([]);
    expect(extractRoleIds([{ nope: 1 }, "x", null])).toEqual([]);
  });
});
