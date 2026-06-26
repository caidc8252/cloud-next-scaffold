"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"

import { cn } from "../../../lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-md font-semibold whitespace-nowrap transition-all outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      // DS 2.0 — 6 variants (spec's primary/secondary/ghost/danger/link + ghost-danger
      // for row-level destructive icon buttons). Retired: default/destructive (aliases),
      // outline/tertiary/subtle/soft (folded), soft-success/warning/danger/info (unused).
      variant: {
        primary: "bg-primary text-primary-foreground shadow-cta hover:bg-primary-600 active:bg-primary-800 bg-clip-border",
        secondary:
          "bg-surface-2 text-content-primary border-line-default shadow-1 hover:bg-surface-hover hover:border-line-strong active:bg-surface-active aria-expanded:bg-surface-hover aria-expanded:border-line-strong",
        ghost:
          "hover:bg-surface-hover active:bg-surface-active aria-expanded:bg-surface-hover",
        "ghost-danger":
          "text-error hover:bg-error-bg hover:text-error-strong active:bg-error/15 aria-expanded:bg-error-bg focus-visible:border-error-strong/40",
        // Solid error steps: error → error-strong → error-active.
        danger:
          "bg-error text-content-inverse shadow-cta hover:bg-error-strong active:bg-error-active focus-visible:border-error-strong/40 bg-clip-border",
        link: "h-auto! p-0! border-transparent! text-primary-500 hover:underline",
      },
      size: {
        default:
          "h-control-md gap-1.5 px-cx-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-control-sm gap-1 rounded-[min(var(--radius-md),12px)] px-cx-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        md: "h-control-md gap-1.5 px-cx-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-control-lg gap-1.5 px-cx-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        // Content-driven height. Padding sets the minimum; multiline children,
        // icons, badges all push the button taller. Pair with `whitespace-normal`
        // when wrapping text, and override `items-*` for top-aligned content.
        // Use when the Button is being treated as a clickable card (option,
        // tile, list row); for plain CTAs prefer sm/md/lg.
        auto: "gap-1.5 px-cx-md py-2 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  loading?: boolean
  block?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
}

// Clickable action button.
// variant: 'primary'|'secondary'|'ghost'|'ghost-danger'|'danger'|'link'.
// size: 'default'|'xs'|'sm'|'md'|'lg'|'icon'|'icon-xs'|'icon-sm'|'icon-lg'.
// loading: shows a spinner in place of iconLeft and disables the button.
// block: sets w-full. iconLeft/iconRight: inline icon slots with auto-spacing.
function Button({
  className,
  variant = "primary",
  size = "default",
  loading,
  block,
  iconLeft,
  iconRight,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), block && "w-full", className)}
      {...props}
    >
      {loading ? <Loader2Icon className="animate-spin" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }

