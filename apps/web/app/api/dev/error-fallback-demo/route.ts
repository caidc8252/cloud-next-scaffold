import { prisma } from "@cloud/db";
import { assertPermissions } from "@cloud/permissions/server";
import { badRequestResponse, successResponse } from "@cloud/request/server";
import { withApiHandler } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

type DemoScenario = "success" | "business-error" | "fallback-error" | "pagination";

type DemoSummary = {
  entity: {
    id: number;
    name: string;
    status: string;
    contractDefineCode: string;
  };
  counts: {
    visibleMenus: number;
    permissions: number;
    activeUsers: number;
  };
  checkedAt: string;
};

type DemoMenuRow = {
  id: number;
  title: string;
  path: string | null;
  icon: string | null;
  sort: number;
  parentMenuId: number | null;
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
    return await getPaginatedMenus(url, session.entity.contractDefineCode);
  }

  return await getSummary(session.entity.entityId, session.entity.contractDefineCode);
});

async function getSummary(entityId: number, contractDefineCode: string) {
  const [entity, visibleMenus, permissions, activeUsers] = await Promise.all([
    prisma.sysEntity.findUnique({
      where: { entityId },
      select: {
        entityId: true,
        entityName: true,
        status: true,
      },
    }),
    prisma.sysMenu.count({
      where: {
        contractDefineCode,
        isVisible: true,
      },
    }),
    prisma.sysPermission.count({
      where: {
        menu: {
          contractDefineCode,
        },
      },
    }),
    prisma.sysEntityUser.count({
      where: {
        entityId,
        status: "ACTIVE",
      },
    }),
  ]);

  if (!entity) {
    return badRequestResponse("demo.entity_missing", "Current session entity does not exist.");
  }

  return successResponse<DemoSummary>({
    entity: {
      id: entity.entityId,
      name: entity.entityName,
      status: entity.status,
      contractDefineCode,
    },
    counts: {
      visibleMenus,
      permissions,
      activeUsers,
    },
    checkedAt: new Date().toISOString(),
  });
}

async function getPaginatedMenus(url: URL, contractDefineCode: string) {
  const page = parsePositiveInteger(url.searchParams.get("page"), DEFAULT_PAGE);
  const limit = parsePositiveInteger(url.searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const where = {
    contractDefineCode,
    isVisible: true,
  };

  const [total, menus] = await Promise.all([
    prisma.sysMenu.count({ where }),
    prisma.sysMenu.findMany({
      where,
      select: {
        menuId: true,
        menuTitle: true,
        path: true,
        icon: true,
        sort: true,
        parentMenuId: true,
      },
      orderBy: [{ sort: "asc" }, { menuId: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNextPage = page < totalPages;

  return successResponse<DemoMenuRow[]>(
    menus.map((menu) => ({
      id: menu.menuId,
      title: menu.menuTitle,
      path: menu.path,
      icon: menu.icon,
      sort: menu.sort,
      parentMenuId: menu.parentMenuId,
    })),
    {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      nextCursor: hasNextPage ? String(page + 1) : null,
    },
  );
}
