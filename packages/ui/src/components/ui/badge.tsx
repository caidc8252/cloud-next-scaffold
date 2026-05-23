"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type BadgeTone = "neutral" | "success" | "warning" | "error" | "info"

const toneVariantMap: Record<BadgeTone, "default" | "secondary" | "destructive" | "outline"> = {
  neutral: "secondary",
  success: "default",
  warning: "outline",
  error: "destructive",
  info: "secondary",
}

const toneCssMap: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-content-secondary border-line-default",
  success: "bg-success-bg text-success-strong border-success/25",
  warning: "bg-warning-bg text-warning-strong border-warning/25",
  error:   "bg-error-bg text-error-strong border-error/25",
  info:    "bg-info-bg text-info-strong border-info/25",
}

interface BadgeProps extends useRender.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  tone?: BadgeTone
}

// Small inline label for status or category. tone: 'neutral'|'success'|'warning'|'error'|'info' maps to semantic colors.
// Prefer tone over variant for status indicators (e.g. order state, health checks).
function Badge({
  className,
  variant,
  tone,
  render,
  ...props
}: BadgeProps) {
  const resolvedVariant = variant ?? (tone ? toneVariantMap[tone] : "default")
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant: resolvedVariant }), tone && toneCssMap[tone], className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant: resolvedVariant,
    },
  })
}

export { Badge, badgeVariants }


