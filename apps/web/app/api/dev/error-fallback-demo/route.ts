import { prisma } from "@cloud/db";
import { assertPermissions } from "@cloud/permissions/server";
import {
  badRequestResponse,
  buildCursorPage,
  readCursorQuery,
  successResponse,
} from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

type DemoScenario = "success" | "business-error" | "fallback-error" | "pagination";

type DemoSummary = {
  partner: {
    id: number;
    name: string;
    status: string;
    contractTypes: string[];
  };
  counts: {
    roles: number;
    rolePermissions: number;
    activeUsers: number;
  };
  checkedAt: string;
};

type DemoRoleRow = {
  id: number;
  name: string;
  type: string;
  contract: string | null;
};

function parsePositiveInteger(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function parseScenario(value: string | null): DemoScenario | null {
  if (
    value === "success" ||
    value === "business-error" ||
    value === "fallback-error" ||
    value === "pagination"
  ) {
    return value;
  }

  return null;
}

export const GET = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({});
  const url = new URL(req.url);
  const scenario = parseScenario(url.searchParams.get("scenario") ?? "success");

  if (!scenario) {
    return badRequestResponse("demo.invalid_scenario", "Unsupported demo scenario.");
  }

  if (scenario === "business-error") {
    return badRequestResponse("demo.expected_error", "This is an intentional demo error response.");
  }

  if (scenario === "fallback-error") {
    throw new Error("Intentional demo fallback error.");
  }

  if (scenario === "pagination") {
    return await getPaginatedRoles(url, session.currentPartnerId);
  }

  return await getSummary(session.currentPartnerId, session.contractTypes);
});

async function getSummary(partnerId: number, contractTypes: string[]) {
  const where = { OR: [{ partnerId }, { partnerId: null }] };
  const [partner, roles, rolePermissions, activeUsers] = await Promise.all([
    prisma.sysPartner.findUnique({
      where: { partnerId },
      select: { partnerId: true, partnerName: true, status: true },
    }),
    prisma.sysRole.count({ where }),
    prisma.sysRolePermission.count(),
    prisma.sysPartnerUser.count({ where: { partnerId, status: "ACTIVE" } }),
  ]);

  if (!partner) {
    return badRequestResponse("demo.partner_missing", "Current session partner does not exist.");
  }

  return successResponse<DemoSummary>({
    partner: {
      id: partner.partnerId,
      name: partner.partnerName,
      status: partner.status,
      contractTypes,
    },
    counts: { roles, rolePermissions, activeUsers },
    checkedAt: new Date().toISOString(),
  });
}

async function getPaginatedRoles(url: URL, partnerId: number) {
  const limit = parsePositiveInteger(url.searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  // 游标 token（不透明，原样回传）+ 客户端显式传入的 direction → 查询计划。
  const query = readCursorQuery(
    url.searchParams.get("cursor"),
    url.searchParams.get("direction"),
  );
  const where = { OR: [{ partnerId }, { partnerId: null }] };

  const [total, found] = await Promise.all([
    prisma.sysRole.count({ where }),
    prisma.sysRole.findMany({
      where,
      select: { roleId: true, roleName: true, roleType: true, contractDefineCode: true },
      orderBy: [{ roleId: query.sortOrder }],
      // 多取一条用于探测该方向是否还有下一页，cursor 命中时跳过锚点行本身。
      take: limit + 1,
      ...(query.cursor ? { cursor: { roleId: Number(query.cursor.id) }, skip: 1 } : {}),
    }),
  ]);

  // 切片、翻回升序、生成双向不透明游标都收敛在共享 helper 里。
  const { items, pager } = buildCursorPage({
    rows: found,
    limit,
    query,
    total,
    idOf: (role) => role.roleId,
  });

  return successResponse<DemoRoleRow[]>(
    items.map((role) => ({
      id: role.roleId,
      name: role.roleName,
      type: role.roleType,
      contract: role.contractDefineCode,
    })),
    pager,
  );
}
