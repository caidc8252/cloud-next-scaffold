"use client";

// ─────────────────────────────────────────────────────────────────────────────
// USAGE REFERENCE · @cloud/ui chart kit (Recharts v3 + TOMS DS 2.0)
//
// Every usage of the chart primitives, as compilable snippets. Import everything
// from the subpath `@cloud/ui/components/chart` (NOT the root `@cloud/ui` barrel
// — charts are kept off it to avoid the `Tooltip`/`Legend` name clash). Recharts
// is a dependency of @cloud/ui, so consumers never import `recharts` directly.
//
// The TOMS look (dashed grid, mono axes, dark tooltip, polar grid, brush,
// skeleton) is applied to Recharts' own SVG via component-defaults.css — you
// only compose primitives + a `config`; colors come from the config keys.
//
// Reference / live gallery: apps/showcase/app/(gallery)/charts/page.tsx
// NOT exported from @cloud/ui — never enters the bundle.
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import { Footprints, Waves } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartSkeleton,
  ChartEmpty,
  ChartPieCalloutLabel,
  ChartPieCalloutLabelLine,
  ChartBar,
  BarChart,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Brush,
  LabelList,
  type ChartConfig,
} from "@cloud/ui/components/chart";

// ── Shared mock data ─────────────────────────────────────────────────────────

const MONTHLY = [
  { month: "Jan", card: 186, wallet: 80 },
  { month: "Feb", card: 305, wallet: 200 },
  { month: "Mar", card: 237, wallet: 120 },
  { month: "Apr", card: 173, wallet: 190 },
  { month: "May", card: 209, wallet: 130 },
  { month: "Jun", card: 214, wallet: 140 },
];

const VENDORS = [
  { vendor: "newland", terminals: 820 },
  { vendor: "verifone", terminals: 280 },
  { vendor: "pax", terminals: 128 },
  { vendor: "ingenico", terminals: 90 },
];
// Per-slice colour in the data (Pie reads `entry.fill`) — the v3 replacement for <Cell>.
const VENDORS_COLORED = VENDORS.map((v) => ({ ...v, fill: `var(--color-${v.vendor})` }));

// ── 1 · ChartConfig — three ways to assign series colors ─────────────────────

// (a) No color → ordinal palette: card→--color-chart-1, wallet→--color-chart-2.
const autoConfig = {
  card: { label: "Card" },
  wallet: { label: "Wallet" },
} satisfies ChartConfig;

// (b) Explicit color (any CSS color / token var), or a per-theme {light,dark} pair.
const explicitConfig = {
  card: { label: "Card", color: "var(--color-chart-div-pos)" },
  wallet: { label: "Wallet", theme: { light: "#1b4332", dark: "#95d5b2" } },
} satisfies ChartConfig;

// (c) With icons (used by tooltip/legend in place of the color swatch).
const activityConfig = {
  card: { label: "Running", icon: Footprints },
  wallet: { label: "Swimming", icon: Waves },
} satisfies ChartConfig;

// Consume the assigned color anywhere with `var(--color-<key>)`.

// ── 2 · Bar — grouped / stacked / horizontal / mixed / value labels ──────────

export function GroupedBar() {
  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <BarChart data={MONTHLY}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {/* ChartBar defaults to a 4px radius on the free end, flat against the axis. */}
        <ChartBar dataKey="card" fill="var(--color-card)" />
        <ChartBar dataKey="wallet" fill="var(--color-wallet)" />
      </BarChart>
    </ChartContainer>
  );
}

export function StackedBar() {
  // Stack-aware rounding: pass `stackKeys` and only the visible top segment of
  // each column rounds — tracking the real top per datum (zero / legend-hidden
  // segments skipped) instead of hand-assigning corners to every segment.
  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <BarChart data={MONTHLY}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent indicator="line" showTotal totalLabel="Total" />} />
        <ChartBar dataKey="card" stackId="a" stackKeys={["card", "wallet"]} fill="var(--color-card)" />
        <ChartBar dataKey="wallet" stackId="a" stackKeys={["card", "wallet"]} fill="var(--color-wallet)" />
      </BarChart>
    </ChartContainer>
  );
}

export function HorizontalBarWithLabels() {
  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <BarChart data={MONTHLY} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="month" tickLine={false} axisLine={false} width={40} />
        <ChartBar dataKey="card" orientation="horizontal" fill="var(--color-card)">
          {/* inline value labels — for ≤ 8 bars */}
          <LabelList dataKey="card" position="right" className="fill-content-secondary text-2xs" />
        </ChartBar>
      </BarChart>
    </ChartContainer>
  );
}

// Unordered categories: per-bar color via a `fill` resolver, each an ordinal hue.
const vendorConfig: ChartConfig = {
  newland: { label: "Newland" },
  verifone: { label: "Verifone" },
  pax: { label: "PAX" },
  ingenico: { label: "Ingenico" },
};

export function MixedColorBar() {
  return (
    <ChartContainer config={vendorConfig} className="h-72 w-full">
      <BarChart data={VENDORS} layout="vertical" margin={{ left: 12, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="vendor"
          tickLine={false}
          axisLine={false}
          width={72}
          tickFormatter={(v: string) => String(vendorConfig[v]?.label ?? v)}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartBar
          dataKey="terminals"
          orientation="horizontal"
          fill={(e) => `var(--color-${String(e.vendor)})`}
        />
      </BarChart>
    </ChartContainer>
  );
}

// ── 3 · Line — multi-series, dots, + drag-to-zoom brush ──────────────────────

export function MultiLineWithBrush() {
  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <LineChart data={MONTHLY} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {/* TOMS line weight is a per-instance prop, not forced by CSS */}
        <Line dataKey="card" type="monotone" stroke="var(--color-card)" strokeWidth={2} dot={false} />
        <Line dataKey="wallet" type="monotone" stroke="var(--color-wallet)" strokeWidth={2} dot />
        <Brush dataKey="month" height={22} travellerWidth={8} />
      </LineChart>
    </ChartContainer>
  );
}

// ── 4 · Area — stacked, low-opacity fill ─────────────────────────────────────

export function StackedArea() {
  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <AreaChart data={MONTHLY} margin={{ left: 4, right: 12, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="card" type="monotone" stackId="a" stroke="var(--color-card)" fill="var(--color-card)" fillOpacity={0.2} strokeWidth={2} />
        <Area dataKey="wallet" type="monotone" stackId="a" stroke="var(--color-wallet)" fill="var(--color-wallet)" fillOpacity={0.2} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

// ── 5 · Pie / Donut — cells pull the per-key palette; legend reuses config ───

export function Donut() {
  return (
    <ChartContainer config={vendorConfig} className="mx-auto h-72 w-full max-w-md">
      <PieChart margin={{ top: 18, right: 64, bottom: 18, left: 64 }}>
        <ChartTooltip content={<ChartTooltipContent nameKey="vendor" hideLabel />} />
        <Pie
          data={VENDORS_COLORED}
          dataKey="terminals"
          nameKey="vendor"
          innerRadius={52}
          outerRadius={76}
          paddingAngle={2}
          label={<ChartPieCalloutLabel nameKey="vendor" />}
          labelLine={<ChartPieCalloutLabelLine />}
        />
        <ChartLegend content={<ChartLegendContent nameKey="vendor" />} />
      </PieChart>
    </ChartContainer>
  );
}

// ── 6 · Radar — compare two profiles across shared axes ──────────────────────

const RADAR_DATA = [
  { metric: "Speed", current: 120, target: 110 },
  { metric: "Uptime", current: 98, target: 130 },
  { metric: "Support", current: 86, target: 130 },
  { metric: "Cost", current: 99, target: 100 },
];
const radarConfig = {
  current: { label: "Current" },
  target: { label: "Target" },
} satisfies ChartConfig;

export function RadarTwoSeries() {
  return (
    <ChartContainer config={radarConfig} className="mx-auto h-72 w-full max-w-md">
      <RadarChart data={RADAR_DATA}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Radar dataKey="current" stroke="var(--color-current)" fill="var(--color-current)" fillOpacity={0.25} strokeWidth={2} />
        <Radar dataKey="target" stroke="var(--color-target)" fill="var(--color-target)" fillOpacity={0.15} strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  );
}

// ── 7 · Radial bar — ranked categories as concentric rings ───────────────────

const RADIAL_DATA = VENDORS.map((v) => ({ ...v, fill: `var(--color-${v.vendor})` }));

export function RadialRings() {
  return (
    <ChartContainer config={vendorConfig} className="mx-auto h-72 w-full max-w-md">
      <RadialBarChart data={RADIAL_DATA} innerRadius={30} outerRadius={110} startAngle={90} endAngle={-270}>
        <ChartTooltip content={<ChartTooltipContent nameKey="vendor" hideLabel />} />
        <RadialBar dataKey="terminals" background cornerRadius={4} />
        <ChartLegend content={<ChartLegendContent nameKey="vendor" />} />
      </RadialBarChart>
    </ChartContainer>
  );
}

// ── 8 · Tooltip variants ─────────────────────────────────────────────────────

// dot (default) · line · dashed · none indicator; hide the header; remap/format it.
export function TooltipIndicators() {
  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <BarChart data={MONTHLY}>
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        {/* header via label formatter; values via value formatter (unit suffix) */}
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(label) => `Month · ${String(label)}`}
              formatter={(value) => `${typeof value === "number" ? value : 0} kcal`}
            />
          }
        />
        <ChartBar dataKey="card" fill="var(--color-card)" />
      </BarChart>
    </ChartContainer>
  );
}

// Icon rows (from config.icon) + summed Total row.
export function TooltipIconsAndTotal() {
  return (
    <ChartContainer config={activityConfig} className="h-72 w-full">
      <BarChart data={MONTHLY}>
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent showTotal totalLabel="Total" />} />
        <ChartBar dataKey="card" stackId="a" stackKeys={["card", "wallet"]} fill="var(--color-card)" />
        <ChartBar dataKey="wallet" stackId="a" stackKeys={["card", "wallet"]} fill="var(--color-wallet)" />
      </BarChart>
    </ChartContainer>
  );
}

// ── 9 · Legend — static, line-indicator, and interactive (toggle → filter) ───

export function StaticLegend() {
  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <LineChart data={MONTHLY}>
        <XAxis dataKey="month" />
        {/* `line` swatch for line/area series */}
        <ChartLegend content={<ChartLegendContent indicator="line" />} />
        <Line dataKey="card" stroke="var(--color-card)" strokeWidth={2} dot={false} />
        <Line dataKey="wallet" stroke="var(--color-wallet)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

// Interactive: pass `hidden` + `onToggle`; the legend renders aria-pressed
// buttons and the consumer applies `hide` to the matching series.
export function InteractiveLegend() {
  const [hidden, setHidden] = React.useState<Record<string, boolean>>({});
  const toggle = (key: string) => setHidden((h) => ({ ...h, [key]: !h[key] }));
  const hiddenKeys = Object.keys(hidden).filter((key) => hidden[key]);

  return (
    <ChartContainer config={autoConfig} className="h-72 w-full">
      <BarChart data={MONTHLY}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent hidden={hidden} onToggle={toggle} />} />
        {/* Stacked + hidden-aware: hiding the top series re-rounds the new visible top. */}
        <ChartBar dataKey="card" stackId="a" stackKeys={["card", "wallet"]} hiddenKeys={hiddenKeys} hide={hidden.card} fill="var(--color-card)" />
        <ChartBar dataKey="wallet" stackId="a" stackKeys={["card", "wallet"]} hiddenKeys={hiddenKeys} hide={hidden.wallet} fill="var(--color-wallet)" />
      </BarChart>
    </ChartContainer>
  );
}

// ── 10 · Loading & empty states (drop-in for the whole chart area) ───────────

export function LoadingState() {
  return <ChartSkeleton className="h-72 w-full" />;
}

export function EmptyState() {
  return (
    <ChartEmpty
      className="h-72 w-full rounded-md border border-line-default"
      title="No transactions in range."
      description="Try widening to the last 30 days."
    />
  );
}

// Typical wiring: pick the state by your fetch status.
export function ChartWithStates({
  status,
}: {
  status: "loading" | "empty" | "ready";
}) {
  if (status === "loading") return <LoadingState />;
  if (status === "empty") return <EmptyState />;
  return <GroupedBar />;
}

// Pin the unused-but-illustrative configs so the file stays a complete
// reference without tripping no-unused-vars.
export const CONFIG_EXAMPLES = { autoConfig, explicitConfig, activityConfig };
