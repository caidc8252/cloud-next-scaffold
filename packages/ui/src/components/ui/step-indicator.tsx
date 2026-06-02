"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

type StepState = NonNullable<VariantProps<typeof stepDotVariants>["state"]>

// Circle that carries the step number, or a check once the step is completed.
// completed -> success green (filled-soft), active -> filled primary, upcoming -> muted outline.
const stepDotVariants = cva(
  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm transition-colors",
  {
    variants: {
      state: {
        completed: "border-success/25 bg-success-bg text-success-strong",
        active: "border-primary bg-primary font-semibold text-primary-foreground shadow-cta",
        upcoming: "border-line-default bg-surface-3 font-medium text-content-tertiary",
      },
    },
    defaultVariants: { state: "upcoming" },
  },
)

// Only the active step's title is emphasized; completed/upcoming stay secondary.
const stepLabelVariants = cva("text-sm", {
  variants: {
    state: {
      completed: "font-medium text-content-secondary",
      active: "font-semibold text-content-primary",
      upcoming: "font-medium text-content-secondary",
    },
  },
  defaultVariants: { state: "upcoming" },
})

interface StepIndicatorStep {
  // Main step title.
  label: string
  // Optional small uppercase caption above the title (e.g. "Step 1").
  caption?: string
}

interface StepIndicatorProps extends React.ComponentProps<"ol"> {
  steps: StepIndicatorStep[]
  // Index of the active step (0-based). Earlier steps render completed, later ones upcoming.
  current: number
}

// Horizontal, display-only progress indicator for multi-step flows (wizards).
// Pure presentation: navigation is driven by the surrounding form, not by this component.
// For the numeric +/- spinbutton see `Stepper` — different component, similar name.
//
// Usage:
//   const [current, setCurrent] = useState(0) // 0-based active step
//   <StepIndicator
//     current={current}
//     steps={[
//       { caption: "Step 1", label: "Company" },
//       { caption: "Step 2", label: "Contracts" },
//       { caption: "Done",   label: "Confirmation" },
//     ]}
//   />
//   // Drive `current` from the wizard's Back / Continue buttons.
//
// States derive from `current`: index < current -> completed (green + check),
// index === current -> active (filled primary), index > current -> upcoming (muted).
// `caption` is optional; omit it for title-only steps.
//
// Renders bare (just the row of dots + connectors) so it composes anywhere. Wrap it
// yourself for the card look:
//   <StepIndicator
//     className="rounded-xl border border-line-default bg-surface-2 px-6 py-4 shadow-1"
//     steps={steps}
//     current={current}
//   />
function StepIndicator({ steps, current, className, ...props }: StepIndicatorProps) {
  return (
    <ol
      data-slot="step-indicator"
      className={cn("flex items-center", className)}
      {...props}
    >
      {steps.map((step, index) => {
        const state: StepState =
          index < current ? "completed" : index === current ? "active" : "upcoming"
        const isLast = index === steps.length - 1
        return (
          <li
            key={step.label}
            data-state={state}
            aria-current={state === "active" ? "step" : undefined}
            className={cn("flex items-center gap-2", isLast ? "flex-none" : "flex-1")}
          >
            <div className="flex items-center gap-2.5">
              <span className={stepDotVariants({ state })}>
                {state === "completed" ? <CheckIcon size={14} /> : index + 1}
              </span>
              <span className="flex flex-col leading-tight">
                {step.caption ? (
                  <small className="text-xs font-medium tracking-wide text-content-tertiary uppercase">
                    {step.caption}
                  </small>
                ) : null}
                <strong className={stepLabelVariants({ state })}>{step.label}</strong>
              </span>
            </div>
            {!isLast ? (
              <span
                aria-hidden
                className={cn("h-px flex-1", index < current ? "bg-success/50" : "bg-line-default")}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export { StepIndicator, stepDotVariants, type StepIndicatorProps, type StepIndicatorStep }
