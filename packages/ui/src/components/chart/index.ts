// TOMS-themed Recharts primitives. Reached ONLY via this subpath
// (`@cloud/ui/components/chart`) — deliberately NOT merged into the root
// `@cloud/ui` barrel, since Recharts' `Tooltip`/`Legend` would collide with
// the existing `Tooltip` export there. Use the `Chart*` aliases instead.
export {
  ChartContainer,
  ChartStyle,
  useChart,
  buildChartVars,
  type ChartConfig,
} from "./chart"
export {
  ChartTooltip,
  ChartTooltipContent,
  type ChartTooltipContentProps,
} from "./chart-tooltip"
export {
  ChartLegend,
  ChartLegendContent,
  type ChartLegendContentProps,
} from "./chart-legend"
export {
  ChartSkeleton,
  ChartEmpty,
  type ChartEmptyProps,
} from "./chart-states"

// Recharts composition building blocks, re-exported so consumers compose a
// whole chart out of `@cloud/ui/components/chart` imports and never depend on
// `recharts` directly. (Recharts `Tooltip`/`Legend` intentionally omitted —
// use the `Chart*` aliases above.)
export {
  ResponsiveContainer,
  // cartesian
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,
  // pie / radial / radar (polar)
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  // shared
  Cell,
  Label,
  LabelList,
} from "recharts"
