"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Download, Search, X } from "lucide-react";
import {
  Button,
  Card,
  Input,
  PageBody,
  PageHeader,
  RichPagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  toast,
  type TableColumn,
} from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import { request } from "@cloud/request/client";
import { toastError } from "@cloud/request/error-toast";
import type { Notice, NoticeStatus } from "@/service/notification/types";
import { useNotifications } from "../../_components/notifications-provider";
import { isUnread, relTime } from "../_lib/notice-meta";
import { ModuleChip } from "./module-chip";

type ModuleFilter = "All" | "ticket" | "customer" | "app" | "order" | "account";
type StatusFilter = "All" | NoticeStatus;
type Filters = { q: string; module: ModuleFilter; status: StatusFilter };

const EMPTY: Filters = { q: "", module: "All", status: "All" };
const MODULES: Exclude<ModuleFilter, "All">[] = ["ticket", "customer", "app", "order", "account"];
const STATUSES: NoticeStatus[] = ["UNREAD", "READ"];

export function NotificationsPage() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const { unreadCount, markRead, markAllRead } = useNotifications();

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const moduleLabel = (m: ModuleFilter) =>
    m === "All" ? t("filter.allTypes") : t(`module.${m}`);
  const statusLabel = (s: StatusFilter) =>
    s === "All" ? t("filter.allStatuses") : t(`status.${s.toLowerCase()}`);

  const applyFilters = () => {
    setApplied(draft);
    setPage(1);
  };
  const clearOne = (key: keyof Filters) => {
    const next = { ...applied, [key]: EMPTY[key] };
    setApplied(next);
    setDraft(next);
    setPage(1);
  };
  const clearAll = () => {
    setApplied(EMPTY);
    setDraft(EMPTY);
    setPage(1);
  };

  // Server-side fetch: triggered by page, pageSize, or applied filters
  useEffect(() => {
    let alive = true;
    const q = {
      page,
      limit: pageSize,
      ...(applied.status !== "All" ? { status: applied.status } : {}),
      ...(applied.module !== "All" ? { module: applied.module } : {}),
      ...(applied.q ? { q: applied.q } : {}),
    };
    async function load() {
      setLoading(true);
      try {
        const res = await request.get<{ items: Notice[] }>("/api/notifications", { query: q });
        if (!alive) return;
        setNotices(res.data.items);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (alive) toastError(err);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [page, pageSize, applied]);

  const hasFilters = applied.q !== "" || applied.module !== "All" || applied.status !== "All";
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const open = (n: Notice) => {
    // Optimistic: mark this row as read locally, then navigate
    markRead([n.id]);
    setNotices((prev) => prev.map((item) => (item.id === n.id ? { ...item, status: "READ" } : item)));
    router.push(`/notifications/${n.id}`);
  };

  const handleMarkAllRead = () => {
    markAllRead();
    setNotices((prev) => prev.map((n) => ({ ...n, status: "READ" })));
  };

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = [t("col.when"), t("col.type"), t("col.statusHead"), t("col.title"), t("col.body")];
    const rows = notices.map((n) => [
      relTime(n.createdAt),
      n.type ?? "",
      isUnread(n) ? statusLabel("UNREAD") : statusLabel("READ"),
      n.title ?? "",
      n.payload.summary,
    ]);
    const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `notifications_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(t("exported", { count: notices.length }));
  };

  const columns: TableColumn<Notice>[] = [
    {
      key: "dot",
      title: "",
      width: 28,
      render: (n) => (
        <span
          className={`block size-2 rounded-full ${isUnread(n) ? "bg-primary-500" : "bg-transparent"}`}
        />
      ),
    },
    {
      key: "notification",
      title: t("col.notification"),
      render: (n) => (
        <div className="min-w-0">
          <div
            className={`truncate text-sm ${isUnread(n) ? "font-semibold text-content-primary" : "text-content-primary"}`}
          >
            {n.title}
          </div>
          <div className="truncate text-2xs text-content-tertiary">{n.payload.summary}</div>
        </div>
      ),
    },
    { key: "type", title: t("col.type"), render: (n) => <ModuleChip type={n.type} /> },
    {
      key: "when",
      title: t("col.when"),
      align: "right",
      render: (n) => (
        <span className="whitespace-nowrap text-2xs text-content-tertiary">
          {relTime(n.createdAt)}
        </span>
      ),
    },
    {
      key: "chev",
      title: "",
      width: 40,
      align: "right",
      render: () => <ChevronRight className="inline-block size-3.5 text-content-tertiary" />,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("list.title")}
        description={t("list.subtitle")}
        actions={
          <Button
            variant="secondary"
            iconLeft={<Check className="size-4" />}
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
          >
            {t("markAllRead")}
          </Button>
        }
      />
      <PageBody>
        <div className="sticky top-0 z-10 -mx-6 -my-3 flex flex-col gap-2.5 bg-surface-1 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="max-w-72 flex-1">
              <Input
                inputSize="md"
                prefix={<Search className="size-4" />}
                placeholder={t("search.placeholder")}
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
              />
            </div>
            <Select
              value={draft.module}
              onValueChange={(v) => setDraft((d) => ({ ...d, module: v as ModuleFilter }))}
            >
              <SelectTrigger size="default" className="w-44">
                <SelectValue>{(v) => moduleLabel(v as ModuleFilter)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">{t("filter.allTypes")}</SelectItem>
                {MODULES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`module.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={draft.status}
              onValueChange={(v) => setDraft((d) => ({ ...d, status: v as StatusFilter }))}
            >
              <SelectTrigger size="default" className="w-40">
                <SelectValue>{(v) => statusLabel(v as StatusFilter)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">{t("filter.allStatuses")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`status.${s.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="primary"
              size="md"
              iconLeft={<Search className="size-4" />}
              onClick={applyFilters}
            >
              {t("search.action")}
            </Button>
          </div>

          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-content-tertiary">{t("activeFilters")}</span>
              {applied.q && (
                <FilterChip label={t("chip.search", { q: applied.q })} onRemove={() => clearOne("q")} />
              )}
              {applied.module !== "All" && (
                <FilterChip
                  label={t("chip.type", { label: moduleLabel(applied.module) })}
                  onRemove={() => clearOne("module")}
                />
              )}
              {applied.status !== "All" && (
                <FilterChip
                  label={t("chip.status", { label: statusLabel(applied.status) })}
                  onRemove={() => clearOne("status")}
                />
              )}
              <Button variant="ghost" size="xs" onClick={clearAll}>
                {t("clearAll")}
              </Button>
            </div>
          )}
        </div>

        <Card elevation={1} className="-mt-2">
          <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3">
            <div className="text-sm text-content-secondary">
              <span className="font-mono font-semibold tabular-nums text-content-primary">
                {total}
              </span>{" "}
              {t("count", { count: total })}
              {hasFilters && <span className="text-content-tertiary"> {t("matchingFilters")}</span>}
            </div>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download className="size-3.5" />}
              disabled={notices.length === 0 || loading}
              onClick={exportCsv}
            >
              {t("export")}
            </Button>
          </div>

          <Table
            columns={columns}
            rows={notices}
            rowKey={(n) => n.id}
            onRowClick={open}
            empty={
              <div className="py-12 text-center text-sm text-content-tertiary">
                {t("list.emptyFiltered")}
              </div>
            }
          />

          <RichPagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            total={total}
            pageSize={pageSize}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </Card>
      </PageBody>
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700">
      {label}
      <Button variant="ghost" size="icon-xs" onClick={onRemove} aria-label="Remove filter">
        <X className="size-3" />
      </Button>
    </span>
  );
}
