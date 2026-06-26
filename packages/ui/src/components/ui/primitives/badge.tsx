"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import { cn } from "../../../lib/utils"
import { type Tone } from "../_tone"

// Chip shell: shape / spacing / focus only. Color is driven entirely by `tone`.
const badgeBase =
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:shadow-focus has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!"

type BadgeTone = Tone
type BadgeShape = "pill" | "tag"

// Semantic status color — the only color axis. `neutral` is the default. There is
// no `variant`: status badges differ by tone, not by form (see ./_tone).
const toneCssMap: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-content-secondary border-line-default",
  success: "bg-success-bg text-success-strong border-success/25",
  warning: "bg-warning-bg text-warning-strong border-warning/25",
  error:   "bg-error-bg text-error-strong border-error/25",
  info:    "bg-info-bg text-info-strong border-info/25",
}

interface BadgeProps extends useRender.ComponentProps<"span"> {
  tone?: BadgeTone
  shape?: BadgeShape
  // Show a leading status dot. Color follows the text color (bg-current), so it
  // matches the tone and stays darker than the badge background.
  dot?: boolean
}

// Small inline label for status or category. Color is set entirely by `tone`
// ('neutral'|'success'|'warning'|'error'|'info'), defaulting to neutral.
// shape: 'pill' (default) | 'tag'. Set `dot` to prefix a small status dot.
function Badge({
  className,
  tone = "neutral",
  shape = "pill",
  dot,
  children,
  render,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(
          badgeBase,
          toneCssMap[tone],
          shape === "tag" && "rounded-sm font-mono",
          className,
        ),
        children: (
          <>
            {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      tone,
    },
  })
}

export { Badge, type BadgeShape, type BadgeTone }
