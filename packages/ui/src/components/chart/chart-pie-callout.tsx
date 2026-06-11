"use client"

import * as React from "react"

import { cn } from "../../lib/utils"
import { useChart, type ChartConfig } from "./chart"

const RADIAN = Math.PI / 180

export type ChartPieCalloutSectorProps = {
  cx?: number | string
  cy?: number | string
  midAngle?: number | string
  outerRadius?: number | string
  value?: number | string
  name?: number | string
  payload?: Record<string, unknown>
  fill?: string
  stroke?: string
  index?: number
  percent?: number
  points?: Array<{ x?: number | string; y?: number | string }>
}

export type ChartPieCalloutGeometry = {
  startX: number
  startY: number
  elbowX: number
  elbowY: number
  endX: number
  endY: number
  labelX: number
  labelY: number
  textAnchor: "start" | "end"
}

export type ChartPieCalloutGeometryOptions = {
  /** Distance from the sector edge to the angled elbow. */
  offset?: number
  /** Horizontal segment length after the elbow. */
  elbowLength?: number
  /** Gap between the horizontal segment and the text block. */
  labelGap?: number
}

export interface ChartPieCalloutLabelProps
  extends ChartPieCalloutSectorProps,
    ChartPieCalloutGeometryOptions {
  nameKey?: string
  hideValue?: boolean
  className?: string
  nameClassName?: string
  valueClassName?: string
  nameFormatter?: (
    name: React.ReactNode,
    payload: Record<string, unknown> | undefined,
  ) => React.ReactNode
  valueFormatter?: (
    value: number | string | undefined,
    payload: Record<string, unknown> | undefined,
  ) => React.ReactNode
}

export interface ChartPieCalloutLabelLineProps
  extends ChartPieCalloutSectorProps,
    ChartPieCalloutGeometryOptions {
  className?: string
  color?: string
  strokeWidth?: number | string
}

function toFiniteNumber(value: number | string | undefined): number | null {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

function readPayloadString(
  payload: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = payload?.[key]
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
  }
  return undefined
}

function isVisiblePaint(value: string | undefined): value is string {
  return Boolean(value && value !== "none")
}

export function resolvePieCalloutLineColor(props: ChartPieCalloutLabelLineProps): string {
  if (isVisiblePaint(props.color)) return props.color
  if (isVisiblePaint(props.stroke)) return props.stroke
  if (isVisiblePaint(props.fill)) return props.fill
  return "currentColor"
}

export function getPieCalloutGeometry(
  props: ChartPieCalloutSectorProps,
  {
    offset = 16,
    elbowLength = 28,
    labelGap = 6,
  }: ChartPieCalloutGeometryOptions = {},
): ChartPieCalloutGeometry | null {
  const cx = toFiniteNumber(props.cx)
  const cy = toFiniteNumber(props.cy)
  const midAngle = toFiniteNumber(props.midAngle)
  const outerRadius = toFiniteNumber(props.outerRadius)

  const [lineStart, lineElbow] = props.points ?? []
  const pointStartX = toFiniteNumber(lineStart?.x)
  const pointStartY = toFiniteNumber(lineStart?.y)
  const pointElbowX = toFiniteNumber(lineElbow?.x)
  const pointElbowY = toFiniteNumber(lineElbow?.y)

  if (
    pointStartX != null &&
    pointStartY != null &&
    pointElbowX != null &&
    pointElbowY != null
  ) {
    const side =
      cx == null
        ? pointElbowX >= pointStartX
          ? 1
          : -1
        : pointElbowX >= cx
          ? 1
          : -1
    const endX = pointElbowX + side * elbowLength

    return {
      startX: pointStartX,
      startY: pointStartY,
      elbowX: pointElbowX,
      elbowY: pointElbowY,
      endX,
      endY: pointElbowY,
      labelX: endX + side * labelGap,
      labelY: pointElbowY,
      textAnchor: side > 0 ? "start" : "end",
    }
  }

  if (cx == null || cy == null || midAngle == null || outerRadius == null) {
    return null
  }

  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)
  const side = cos >= 0 ? 1 : -1
  const startX = cx + outerRadius * cos
  const startY = cy + outerRadius * sin
  const elbowX = cx + (outerRadius + offset) * cos
  const elbowY = cy + (outerRadius + offset) * sin
  const endX = elbowX + side * elbowLength
  const endY = elbowY

  return {
    startX,
    startY,
    elbowX,
    elbowY,
    endX,
    endY,
    labelX: endX + side * labelGap,
    labelY: endY,
    textAnchor: side > 0 ? "start" : "end",
  }
}

export function resolvePieCalloutName(
  config: ChartConfig,
  props: ChartPieCalloutSectorProps,
  nameKey = "name",
): React.ReactNode {
  const rawKey = readPayloadString(props.payload, nameKey)
  const fallbackName = props.name == null ? undefined : String(props.name)
  const configKey = rawKey ?? fallbackName
  if (configKey) return config[configKey]?.label ?? configKey
  return null
}

export function formatPieCalloutValue(value: number | string | undefined): React.ReactNode {
  return typeof value === "number" ? value.toLocaleString() : value
}

export function ChartPieCalloutLabel({
  nameKey = "name",
  hideValue = false,
  className,
  nameClassName,
  valueClassName,
  nameFormatter,
  valueFormatter,
  ...props
}: ChartPieCalloutLabelProps) {
  const { config } = useChart()
  const geometry = getPieCalloutGeometry(props, props)

  if (!geometry) return null

  const name = resolvePieCalloutName(config, props, nameKey)
  const value = valueFormatter
    ? valueFormatter(props.value, props.payload)
    : formatPieCalloutValue(props.value)
  const resolvedName = nameFormatter ? nameFormatter(name, props.payload) : name

  if (resolvedName == null && (hideValue || value == null)) return null

  return (
    <g data-slot="chart-pie-callout-label">
      <text
        x={geometry.labelX}
        y={geometry.labelY}
        textAnchor={geometry.textAnchor}
        className={cn("fill-content-secondary font-mono text-2xs", className)}
      >
        {resolvedName != null ? (
          <tspan
            x={geometry.labelX}
            dy={hideValue || value == null ? 0 : -4}
            className={cn("font-medium", nameClassName)}
          >
            {resolvedName}
          </tspan>
        ) : null}
        {!hideValue && value != null ? (
          <tspan
            x={geometry.labelX}
            dy={resolvedName == null ? 0 : 12}
            className={cn("fill-content-tertiary tabular-nums", valueClassName)}
          >
            {value}
          </tspan>
        ) : null}
      </text>
    </g>
  )
}

export function ChartPieCalloutLabelLine({
  className,
  color,
  strokeWidth = 1,
  ...props
}: ChartPieCalloutLabelLineProps) {
  const geometry = getPieCalloutGeometry(props, props)
  if (!geometry) return null

  return (
    <polyline
      data-slot="chart-pie-callout-label-line"
      points={`${geometry.startX},${geometry.startY} ${geometry.elbowX},${geometry.elbowY} ${geometry.endX},${geometry.endY}`}
      fill="none"
      stroke={resolvePieCalloutLineColor({ ...props, color })}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    />
  )
}
