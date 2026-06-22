"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "../../lib/utils"
import { type Tone } from "./_tone"

// Progress has no "neutral" — omitting tone already yields the default brand color.
type ProgressTone = Exclude<Tone, "neutral">

const toneIndicatorMap: Record<ProgressTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
  info: "bg-info",
}

interface ProgressProps extends ProgressPrimitive.Root.Props {
  // Status color for the indicator. Omit for the default brand color.
  tone?: ProgressTone
}

// Horizontal bar showing numeric completion percentage via the value prop (0–100).
// tone: 'success'|'warning'|'error'|'info' swaps the indicator color; omit for default brand color.
function Progress({
  className,
  children,
  value,
  tone,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator className={tone ? toneIndicatorMap[tone] : undefined} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full bg-surface-3",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full rounded-full bg-primary transition-[width] duration-[var(--duration-normal)]", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-xs text-content-secondary", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-xs text-content-secondary tabular-nums font-mono",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
  type ProgressProps,
  type ProgressTone,
}
