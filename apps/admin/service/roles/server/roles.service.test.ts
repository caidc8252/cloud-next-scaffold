import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_NOT_FOUND,
  ERR_ROLE_UPDATE_BUILTIN,
} from "@cloud/request/error-codes";
import type { ActiveSession } from "@cloud/permissions/server";

// repository 是 I/O 边界,工厂 mock(避免自动 mock 加载真模块触发 @cloud/db 实例化)。
vi.mock("./roles.repository", () => ({
  listRoles: vi.fn(),
  listPartnerRoleBindings: vi.fn(),
  resolveUsernames: vi.fn(),
  findRole: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  countRoleOperatorsInPartner: vi.fn(),
  countRoleAssignmentsAnyPartner: vi.fn(),
}));
// 编码角色注册表 + party scope 由 @/manifest 提供（@cloud/platform-config 的 contractTypeGroup/
// roleIdInGroupRange 保持真实，供 codeRoleIdInScope 组归属门用）。
vi.mock("@/manifest", () => ({
  getRoles: vi.fn(() => []),
  resolvePartyScope: vi.fn(() => new Set<string>()),
}));

import * as repo from "./roles.repository";
import { getRoles, resolvePartyScope } from "@/manifest";
import { createRole, deleteRole, listAssignableRoles, listRoles, updateRole } from "./roles.service";

const session = {
  userId: 1,
  username: "admin",
  currentPartyId: 100,
} as unknown as ActiveSession;

function roleRow(overrides: Record<string, unknown> = {}) {
  return {
    roleId: 3,
    roleName: "Ops",
    roleType: "GLOBAL",
    contractType: "ADMIN",
    remark: "",
    updTime: new Date("2026-01-02T00:00:00.000Z"),
    updUserId: 1,
    permissionCodes: [],
    partyId: 100,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRoles).mockReturnValue([]);
  vi.mocked(resolvePartyScope).mockReturnValue(new Set());
});

describe("listRoles", () => {
  it("merges in-scope coded roles (group gate) with DB roles, dropping DB roles with no in-scope permission", async () => {
    vi.mocked(getRoles).mockReturnValue([
      // roleId 1 已由 getRoles 填成 ADMIN 组权限（含一个组外码 admin.ONLY，验证列表也 ∩ scope）。
      { roleId: 1, roleName: "Administrator", permissionCodes: ["roles.VIEW", "users.VIEW", "admin.ONLY"] },
      { roleId: 2, roleName: "Operator", permissionCodes: ["roles.VIEW"] }, // ADMIN 组
      { roleId: 101, roleName: "Customer Administrator", permissionCodes: [] }, // CUSTOMER 组
    ] as never);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["roles.VIEW", "users.VIEW"]));
    vi.mocked(repo.listRoles).mockResolvedValue([
      roleRow({ roleId: 1001, roleName: "InScope", permissionCodes: ["users.VIEW"], updUserId: 9 }),
      roleRow({ roleId: 1002, roleName: "OutOfScope", permissionCodes: ["ghost.X"] }),
    ] as never);
    vi.mocked(repo.listPartnerRoleBindings).mockResolvedValue([{ roles: [{ roleId: 1001 }] }] as never);
    vi.mocked(repo.resolveUsernames).mockResolvedValue(new Map([[9, "carol"]]));

    const result = await listRoles(100, ["ADMIN"]);
    const ids = result.map((r) => r.id);

    // 编码 1/2 在 ADMIN 组 → 列出；101 是 CUSTOMER 组 → 组归属门排除。
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).not.toContain("101");
    // DB 1001 有 users.VIEW ∈ scope → 列出；1002 仅 ghost.X ∉ scope → 排除。
    expect(ids).toContain("1001");
    expect(ids).not.toContain("1002");

    // 通配预置管理员（roleId 1）：def.permissionCodes 为空，但 VO 应展示当前 party scope 全集。
    const admin = result.find((r) => r.id === "1")!;
    expect(admin.permissions.slice().sort()).toEqual(["roles.VIEW", "users.VIEW"]);
    // 非通配编码角色（Operator）仍展示自身权限码。
    const operator = result.find((r) => r.id === "2")!;
    expect(operator.permissions).toEqual(["roles.VIEW"]);

    const inScope = result.find((r) => r.id === "1001")!;
    expect(inScope.operatorCount).toBe(1);
    expect(inScope.updatedBy).toBe("carol");
  });
});

describe("listAssignableRoles", () => {
  it("delegates to listRoles (same coded 组归属门 + DB scope 过滤口径)", async () => {
    vi.mocked(getRoles).mockReturnValue([
      { roleId: 2, roleName: "Operator", permissionCodes: ["roles.VIEW"] },
    ] as never);
    vi.mocked(resolvePartyScope).mockReturnValue(new Set(["roles.VIEW"]));
    vi.mocked(repo.listRoles).mockResolvedValue([] as never);
    vi.mocked(repo.listPartnerRoleBindings).mockResolvedValue([] as never);
    vi.mocked(repo.resolveUsernames).mockResolvedValue(new Map());

    const result = await listAssignableRoles(100, ["ADMIN"]);

    expect(result.map((r) => r.id)).toEqual(["2"]);
  });
});

describe("createRole", () => {
  it("creates a partner-owned role with the given permissions", async () => {
    vi.mocked(repo.createRole).mockResolvedValue(roleRow({ permissionCodes: ["users.VIEW"] }) as never);

    const role = await createRole(session, { name: "Ops", permissions: ["users.VIEW"] });

    expect(role.operatorCount).toBe(0);
    expect(vi.mocked(repo.createRole).mock.calls[0][0]).toMatchObject({
      roleName: "Ops",
      partyId: 100,
      permissionCodes: ["users.VIEW"],
    });
  });
});

describe("updateRole", () => {
  it("refuses to modify a preset (≤300) role before touching the repo", async () => {
    await expect(
      updateRole(session, 1, { name: "x", permissions: ["roles.ADD"] }),
    ).rejects.toMatchObject({ code: ERR_ROLE_UPDATE_BUILTIN });
    expect(repo.findRole).not.toHaveBeenCalled();
    expect(repo.updateRole).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND for a role owned by another partner", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleId: 1001, partyId: 200 }) as never);
    await expect(updateRole(session, 1001, { name: "x" })).rejects.toMatchObject({
      code: ERR_ROLE_NOT_FOUND,
      status: 404,
    });
  });

  it("applies name/description/permissions on a non-builtin (DB) role", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleId: 1001 }) as never);
    vi.mocked(repo.updateRole).mockResolvedValue(roleRow({ roleId: 1001 }) as never);
    vi.mocked(repo.countRoleOperatorsInPartner).mockResolvedValue(2 as never);

    const role = await updateRole(session, 1001, { name: "  Renamed  ", permissions: ["roles.ADD"] });

    const data = vi.mocked(repo.updateRole).mock.calls[0][1] as Record<string, unknown>;
    expect(data.roleName).toBe("Renamed");
    expect(data.permissionCodes).toEqual(["roles.ADD"]);
    expect(role.operatorCount).toBe(2);
  });
});

describe("deleteRole", () => {
  it("refuses to delete a preset (≤300) role before touching the repo", async () => {
    await expect(deleteRole(session, 1)).rejects.toMatchObject({ code: ERR_ROLE_DELETE_BUILTIN });
    expect(repo.findRole).not.toHaveBeenCalled();
    expect(repo.deleteRole).not.toHaveBeenCalled();
  });

  it("refuses to delete a role still assigned to operators (any partner)", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleId: 1001 }) as never);
    vi.mocked(repo.countRoleAssignmentsAnyPartner).mockResolvedValue(1 as never);
    await expect(deleteRole(session, 1001)).rejects.toMatchObject({
      code: ERR_ROLE_DELETE_ASSIGNED,
      status: 409,
    });
  });

  it("deletes an unassigned, non-builtin, owned role", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleId: 1001 }) as never);
    vi.mocked(repo.countRoleAssignmentsAnyPartner).mockResolvedValue(0 as never);
    vi.mocked(repo.deleteRole).mockResolvedValue({} as never);

    await deleteRole(session, 1001);

    expect(repo.deleteRole).toHaveBeenCalledWith(1001);
  });
});
