import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_NOT_FOUND,
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

import * as repo from "./roles.repository";
import { createRole, deleteRole, listRoles, updateRole } from "./roles.service";

const session = {
  userId: 1,
  username: "admin",
  currentPartnerId: 100,
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
    partnerId: 100,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listRoles", () => {
  it("counts operators per role from partner bindings and resolves updater names", async () => {
    vi.mocked(repo.listRoles).mockResolvedValue([roleRow({ roleId: 3, updUserId: 9 })] as never);
    vi.mocked(repo.listPartnerRoleBindings).mockResolvedValue([
      { roles: [{ roleId: 3 }] },
      { roles: [{ roleId: 3 }, { roleId: 5 }] },
    ] as never);
    vi.mocked(repo.resolveUsernames).mockResolvedValue(new Map([[9, "carol"]]));

    const result = await listRoles(100);

    expect(result[0].operatorCount).toBe(2);
    expect(result[0].updatedBy).toBe("carol");
  });
});

describe("createRole", () => {
  it("creates a partner-owned role with the given permissions", async () => {
    vi.mocked(repo.createRole).mockResolvedValue(roleRow({ permissionCodes: ["users.VIEW"] }) as never);

    const role = await createRole(session, { name: "Ops", permissions: ["users.VIEW"] });

    expect(role.operatorCount).toBe(0);
    expect(vi.mocked(repo.createRole).mock.calls[0][0]).toMatchObject({
      roleName: "Ops",
      partnerId: 100,
      permissionCodes: ["users.VIEW"],
    });
  });
});

describe("updateRole", () => {
  it("throws NOT_FOUND for a role owned by another partner", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ partnerId: 200 }) as never);
    await expect(updateRole(session, 3, { name: "x" })).rejects.toMatchObject({
      code: ERR_ROLE_NOT_FOUND,
      status: 404,
    });
  });

  it("ignores name/description on a BUILTIN role but still applies permissions", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleType: "BUILTIN" }) as never);
    vi.mocked(repo.updateRole).mockResolvedValue(roleRow({ roleType: "BUILTIN" }) as never);
    vi.mocked(repo.countRoleOperatorsInPartner).mockResolvedValue(0 as never);

    await updateRole(session, 3, { name: "hacked", description: "x", permissions: ["roles.ADD"] });

    const data = vi.mocked(repo.updateRole).mock.calls[0][1] as Record<string, unknown>;
    expect(data.roleName).toBeUndefined();
    expect(data.remark).toBeUndefined();
    expect(data.permissionCodes).toEqual(["roles.ADD"]);
  });

  it("applies name/description on a non-builtin role", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleType: "GLOBAL" }) as never);
    vi.mocked(repo.updateRole).mockResolvedValue(roleRow() as never);
    vi.mocked(repo.countRoleOperatorsInPartner).mockResolvedValue(2 as never);

    const role = await updateRole(session, 3, { name: "  Renamed  " });

    expect((vi.mocked(repo.updateRole).mock.calls[0][1] as Record<string, unknown>).roleName).toBe(
      "Renamed",
    );
    expect(role.operatorCount).toBe(2);
  });
});

describe("deleteRole", () => {
  it("refuses to delete a BUILTIN role", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleType: "BUILTIN" }) as never);
    await expect(deleteRole(session, 3)).rejects.toMatchObject({ code: ERR_ROLE_DELETE_BUILTIN });
    expect(repo.deleteRole).not.toHaveBeenCalled();
  });

  it("refuses to delete a role still assigned to operators (any partner)", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleType: "GLOBAL" }) as never);
    vi.mocked(repo.countRoleAssignmentsAnyPartner).mockResolvedValue(1 as never);
    await expect(deleteRole(session, 3)).rejects.toMatchObject({
      code: ERR_ROLE_DELETE_ASSIGNED,
      status: 409,
    });
  });

  it("deletes an unassigned, non-builtin, owned role", async () => {
    vi.mocked(repo.findRole).mockResolvedValue(roleRow({ roleType: "GLOBAL" }) as never);
    vi.mocked(repo.countRoleAssignmentsAnyPartner).mockResolvedValue(0 as never);
    vi.mocked(repo.deleteRole).mockResolvedValue({} as never);

    await deleteRole(session, 3);

    expect(repo.deleteRole).toHaveBeenCalledWith(3);
  });
});
