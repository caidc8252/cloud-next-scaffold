"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Gauge, Layers, LogOut, Plus, Search, Settings, Smartphone, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, Button, Empty, StatCard, StatGrid, cn } from "@cloud/ui";
import { request } from "@cloud/request/client";
import { useTranslations } from "@cloud/i18n/client";
import type { Account, DashboardKpi } from "@/lib/mock/types";
import { initials } from "@/lib/format";
import { PepLogo } from "@/app/_components/brand";

const NAV: { key: string; Icon: LucideIcon }[] = [
  { key: "overview", Icon: Gauge },
  { key: "devices", Icon: Smartphone },
  { key: "firmware", Icon: Layers },
  { key: "merchants", Icon: Store },
  { key: "alerts", Icon: Bell },
  { key: "settings", Icon: Settings },
];
const KPI_ICONS: Record<string, LucideIcon> = {
  activeTerminals: Smartphone,
  fleetUptime: Gauge,
  pendingUpdates: Layers,
  openAlerts: Bell,
};

export function DashboardScreen({ account }: { account: Account }) {
  const t = useTranslations("portal.dashboard");
  const tb = useTranslations("portal.brand");
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [kpis, setKpis] = useState<DashboardKpi[]>([]);

  useEffect(() => {
    request
      .get<{ kpis: DashboardKpi[] }>("/api/dashboard/overview")
      .then((res) => setKpis(res.data.kpis))
      .catch(() => setKpis([]));
  }, []);

  async function signOut() {
    await request.post("/api/auth/logout", {});
    router.replace("/login");
    router.refresh();
  }

  const firstName = account.name.split(" ")[0] || account.name;
  const ActiveIcon = NAV.find((n) => n.key === active)?.Icon ?? Smartphone;

  return (
    <div className="flex min-h-screen bg-surface-1">
      {/* sidebar */}
      <aside className="hidden w-[230px] shrink-0 flex-col gap-1 border-r border-line-subtle bg-surface-3 p-3.5 md:flex">
        <div className="px-2 pb-4 pt-1.5">
          <PepLogo size={26} sub={tb("console")} />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ key, Icon }) => (
            <Button
              key={key}
              variant="ghost"
              onClick={() => setActive(key)}
              iconLeft={<Icon size={17} />}
              className={cn(
                "justify-start gap-2.5",
                active === key
                  ? "bg-primary-50 font-semibold text-primary-700 hover:bg-primary-50"
                  : "text-content-secondary",
              )}
            >
              {t(`nav.${key}`)}
            </Button>
          ))}
        </nav>
        <div className="flex-1" />
        <Button
          variant="ghost"
          onClick={signOut}
          title={t("signOut")}
          className="h-auto justify-start gap-2.5 py-2"
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary-700 text-xs font-semibold text-white">
              {initials(account.name)}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <span className="truncate text-sm font-semibold">{account.name}</span>
            <span className="truncate text-xs text-content-tertiary">
              {account.company?.name ?? account.email}
            </span>
          </span>
          <LogOut size={15} className="text-content-tertiary" />
        </Button>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] items-center gap-3.5 border-b border-line-subtle bg-surface-2 px-7">
          <span className="text-base font-semibold">{t(`nav.${active}`)}</span>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" iconLeft={<Search size={15} />}>
            {t("search")}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={t("nav.alerts")}>
            <Bell size={16} />
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-7">
          {active === "overview" ? (
            <>
              <div className="mb-5">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {t("welcomeTitle", { name: firstName })}
                </h1>
                <p className="mt-1 text-sm text-content-secondary">{t("welcomeSub")}</p>
              </div>
              <StatGrid cols={4} className="mb-5">
                {kpis.map((k) => {
                  const Icon = KPI_ICONS[k.key] ?? Smartphone;
                  return (
                    <StatCard
                      key={k.key}
                      label={t(`kpis.${k.key}`)}
                      value={k.value}
                      description={k.delta}
                      icon={<Icon size={16} />}
                    />
                  );
                })}
              </StatGrid>
              <div className="rounded-xl border border-line-default bg-surface-2 p-10 shadow-2">
                <Empty
                  icon={<Layers size={24} />}
                  title={t("deployments.title")}
                  description={t("deployments.sub")}
                  action={
                    <Button size="sm" iconLeft={<Plus size={15} />}>
                      {t("deployments.action")}
                    </Button>
                  }
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-line-default bg-surface-2 p-10 shadow-2">
              <Empty
                icon={<ActiveIcon size={24} />}
                title={t(`nav.${active}`)}
                description={t("placeholder")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
