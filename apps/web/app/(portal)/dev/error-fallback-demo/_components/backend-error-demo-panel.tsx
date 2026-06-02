"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
} from "lucide-react";
import { request, RequestError, type ErrorBody, type SuccessBody } from "@cloud/request/client";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  type TableColumn,
} from "@cloud/ui";
import { useCursorPagination, type CursorPageRequest } from "@/lib/use-cursor-pagination";

const API_URL = "/api/dev/error-fallback-demo";
const PAGE_LIMIT = 5;

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

type DemoPayload = DemoSummary | DemoRoleRow[];

type DemoResult = {
  scenario: DemoScenario;
  status: number;
  ok: boolean;
  body: SuccessBody<DemoPayload> | ErrorBody;
  receivedAt: string;
};

const scenarioLabels: Record<DemoScenario, string> = {
  success: "Success",
  "business-error": "Business Error",
  "fallback-error": "Fallback Error",
  pagination: "Pagination",
};

const columns: TableColumn<DemoRoleRow>[] = [
  { key: "id", title: "ID", field: "id", width: 72 },
  { key: "name", title: "Name", field: "name" },
  { key: "type", title: "Type", field: "type", width: 110 },
  {
    key: "contract",
    title: "Contract",
    render: (row) => row.contract ?? "-",
  },
];

function isSuccessBody(
  body: SuccessBody<DemoPayload> | ErrorBody,
): body is SuccessBody<DemoPayload> {
  return body.code === "OK";
}

function createClientErrorBody(message: string): ErrorBody {
  return {
    code: "client.request_failed",
    message,
    traceId: "-",
  };
}

export function BackendErrorDemoPanel() {
  const [result, setResult] = useState<DemoResult | null>(null);
  const [isLoading, setIsLoading] = useState<DemoScenario | null>(null);
  // 游标全部来自服务端，客户端只持有当前页的游标 + 一个展示用页码，不缓存历史、不读行 id。
  const pagination = useCursorPagination();

  const rows = useMemo(() => {
    if (!result || !isSuccessBody(result.body) || !Array.isArray(result.body.data)) {
      return [];
    }

    return result.body.data;
  }, [result]);

  const total =
    result && isSuccessBody(result.body) ? (result.body.total ?? null) : null;
  const latestTraceId = result?.body.traceId ?? null;
  const latestCode = result?.body.code ?? null;

  async function runScenario(scenario: DemoScenario, req?: CursorPageRequest) {
    setIsLoading(scenario);
    try {
      const response = await request.get<DemoPayload>(API_URL, {
        query: {
          scenario,
          limit: scenario === "pagination" ? PAGE_LIMIT : undefined,
          // cursor 是服务端签发的不透明 token，原样回传；首页为 null 时 buildUrl 会自动跳过。
          cursor: scenario === "pagination" ? req?.cursor : undefined,
          // 翻页方向由客户端显式传，不再编进 token。
          direction: scenario === "pagination" ? req?.direction : undefined,
        },
      });

      if (scenario === "pagination" && req) {
        // 吸收服务端这一页返回的双向游标和翻页标志，下一次翻页只用它们。
        pagination.sync(
          {
            nextCursor: response.nextCursor,
            prevCursor: response.prevCursor,
            hasNextPage: response.hasNextPage,
            hasPrevPage: response.hasPrevPage,
          },
          req.page,
        );
      }

      setResult({
        scenario,
        status: 200,
        ok: true,
        body: response,
        receivedAt: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 0;
      const body =
        error instanceof RequestError && error.body
          ? error.body
          : createClientErrorBody(error instanceof Error ? error.message : "Request failed.");

      setResult({
        scenario,
        status,
        ok: false,
        body,
        receivedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsLoading(null);
    }
  }

  // 从头开始游标分页：清空游标，从第一条记录查起。
  function startPagination() {
    runScenario("pagination", pagination.reset());
  }

  // 向后 / 向前翻页：游标由 hook 从服务端上一次返回里取，客户端不参与构造。
  function goToNextPage() {
    const req = pagination.toNext();
    if (req) runScenario("pagination", req);
  }

  function goToPrevPage() {
    const req = pagination.toPrev();
    if (req) runScenario("pagination", req);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Scenarios</CardTitle>
          <CardDescription>
            Each button calls the same Route Handler with a different mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            type="button"
            variant="primary"
            iconLeft={<CheckCircle2 size={15} />}
            loading={isLoading === "success"}
            onClick={() => runScenario("success")}
          >
            Success DB Query
          </Button>
          <Button
            type="button"
            variant="outline"
            iconLeft={<AlertTriangle size={15} />}
            loading={isLoading === "business-error"}
            onClick={() => runScenario("business-error")}
          >
            Expected Error Body
          </Button>
          <Button
            type="button"
            variant="danger"
            iconLeft={<Bug size={15} />}
            loading={isLoading === "fallback-error"}
            onClick={() => runScenario("fallback-error")}
          >
            Throw Fallback Error
          </Button>
          <Button
            type="button"
            variant="secondary"
            iconLeft={<ListOrdered size={15} />}
            loading={isLoading === "pagination"}
            onClick={() => startPagination()}
          >
            Paginated Roles
          </Button>
          <div className="rounded-lg border border-line-default bg-surface-3 p-3 text-sm">
            {result ? (
              <div className="grid gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-content-secondary">Last result</span>
                  <Badge tone={result.ok ? "success" : result.status >= 500 ? "error" : "warning"}>
                    HTTP {result.status}
                  </Badge>
                </div>
                <div className="font-mono text-xs text-content-secondary">
                  {latestCode} · {latestTraceId}
                </div>
              </div>
            ) : (
              <span className="text-content-tertiary">No request sent yet.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Response</CardTitle>
          <CardDescription>
            {result
              ? `${scenarioLabels[result.scenario]} at ${result.receivedAt}`
              : "No request yet."}
          </CardDescription>
          <CardAction>
            {result ? (
              <Badge tone={result.ok ? "success" : result.status >= 500 ? "error" : "warning"}>
                HTTP {result.status}
              </Badge>
            ) : (
              <Badge tone="neutral">Idle</Badge>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {rows.length > 0 ? (
            <div className="grid gap-3">
              <Table columns={columns} rows={rows} rowKey={(row) => row.id} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-content-secondary">
                  Page {pagination.page}
                  {total !== null ? `, total ${total}` : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    iconLeft={<ChevronLeft size={14} />}
                    disabled={!pagination.canPrev || isLoading === "pagination"}
                    onClick={() => goToPrevPage()}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    iconRight={<ChevronRight size={14} />}
                    disabled={!pagination.canNext || isLoading === "pagination"}
                    onClick={() => goToNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <pre className="max-h-[520px] overflow-auto rounded-lg border border-line-default bg-surface-3 p-4 text-xs leading-relaxed text-content-primary">
            {result
              ? JSON.stringify(result.body, null, 2)
              : "Click a scenario to inspect the response body."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
