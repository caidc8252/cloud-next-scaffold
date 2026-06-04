"use client";

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TEMPLATE · Detail page (spec §1.3 §2.3 §3 §8)
//
// Compilable style skeleton for the portal DETAIL page shape: one page + Tabs
// (no per-tab sub-routes). Reference implementation:
// apps/web/app/(portal)/manage/customers/[id]/_components/customer-detail-view.tsx
//
// Style-only: static data, no-op handlers, <a> stands in for next/link. In a
// real page: page.tsx guards + fetches, mutations go modal → route handler,
// and the back button renders a real <Link> (see §2.3 — mandatory recipe).
// NOT exported from @cloud/ui — never enters the bundle.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { ChevronLeft, Clock, Pencil, Plus, Shield } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cloud/ui";

// §3 — every tab body shares the page padding.
const TAB_BODY_CLASS = "px-6 pt-6 pb-8";

// Neutral count chip on a tab; omit when the count is 0.
function TabCount({ children }: { children: ReactNode }) {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-3 px-1 text-xs font-medium text-content-tertiary">
      {children}
    </span>
  );
}

// §8.1 — KV grid: dl rows with a fixed w-40 label column.
function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-5">
      <dt className="w-40 shrink-0 font-medium text-content-tertiary">{label}</dt>
      <dd className="min-w-0 flex-1 text-content-primary">{children}</dd>
    </div>
  );
}

// §8.1 — right-rail stat card composed from Card (no new primitive).
function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <Card className="gap-1 px-4 py-3.5">
      <div className="text-xs font-medium text-content-secondary">{label}</div>
      <div className="text-2xl font-semibold leading-tight text-content-primary">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-content-tertiary">{sub}</div>}
    </Card>
  );
}

export function DetailPageTemplate() {
  return (
    <Tabs defaultValue="overview" className="gap-0">
      {/* §2.1 — white band; tab strip sits flush on the band's bottom border */}
      <div className="border-b border-line-subtle bg-surface-2">
        <div className="px-6 py-4">
          {/* §2.3 — detail head row. Back button is MANDATORY; in apps/web it must be
              render={<Link href="/manage/customers" />} — never router.back(). */}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back to customers"
              nativeButton={false}
              render={<a href="#back" />}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-3 text-base font-semibold text-content-secondary">
              N
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
                  Northwind Trading Co.
                </h1>
                <Badge tone="success" dot>
                  Active
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-secondary">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> Registered Mar 12, 2024
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="size-3.5" /> License: NW-ISV-0042
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              iconLeft={<Pencil className="size-4" />}
              onClick={() => {}}
            >
              Edit info
            </Button>
          </div>
        </div>
        <div className="flex px-6">
          <TabsList className="shadow-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contracts">
              Contracts
              <TabCount>2</TabCount>
            </TabsTrigger>
            <TabsTrigger value="operators">
              Operators &amp; roles
              <TabCount>3</TabCount>
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      {/* §8.1 — Overview: two columns, main Card carries min-w-0 flex-1 itself */}
      <TabsContent value="overview" className={TAB_BODY_CLASS}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <Card className="min-w-0 flex-1">
            <CardHeader>
              <CardTitle>Company</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col gap-3.5 text-sm">
                <KeyValue label="Name">Northwind Trading Co.</KeyValue>
                <KeyValue label="License">NW-ISV-0042</KeyValue>
                <KeyValue label="Address">
                  <span className="whitespace-pre-line">
                    742 Evergreen Terrace, Springfield, OR, USA
                  </span>
                </KeyValue>
                <KeyValue label="Email">
                  <span className="text-content-tertiary">Not provided</span>
                </KeyValue>
              </dl>
            </CardContent>
          </Card>

          {/* Right rail: 320px on lg, stat cards stacked at gap-6 */}
          <div className="flex w-full flex-col gap-6 lg:w-80 lg:shrink-0">
            <StatCard label="Contracts" value={2} sub="2 Active" />
            <StatCard label="Operators" value={3} sub="3 active" />
            <StatCard label="Last activity" value="2 days ago" />
          </div>
        </div>
      </TabsContent>

      {/* §8.2 — section card: CardAction slot for header buttons (vertically centered),
          CardContent flush with rows as direct children */}
      <TabsContent value="operators" className={TAB_BODY_CLASS}>
        <Card>
          <CardHeader>
            <CardTitle className="text-md">Custom roles</CardTitle>
            <CardDescription className="text-xs leading-relaxed text-content-tertiary">
              Customer-specific roles, only visible to this customer&apos;s operators.
            </CardDescription>
            <CardAction>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Plus className="size-4" />}
                onClick={() => {}}
              >
                Add custom role
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent flush>
            {["Reconciliation Viewer", "Settlement Auditor"].map((name) => (
              <div
                key={name}
                className="flex items-center gap-3.5 border-b border-line-subtle px-4.5 py-3.5 last:border-b-0"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-3 text-content-secondary">
                  <Shield className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-content-primary">{name}</span>
                    <Badge tone="info">Custom</Badge>
                  </div>
                  <div className="text-xs text-content-tertiary">
                    Read-only access to settlement reports.
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Pencil className="size-4" />}
                  onClick={() => {}}
                >
                  Edit
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="contracts" className={TAB_BODY_CLASS}>
        <div className="px-4 py-12 text-center text-sm text-content-tertiary">
          Section empty state — px-4~6 py-8~12, centered, text-sm tertiary.
        </div>
      </TabsContent>
    </Tabs>
  );
}
