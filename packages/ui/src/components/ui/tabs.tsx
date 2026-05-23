"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex items-center",
  {
    variants: {
      variant: {
        default: "h-control-sm gap-1 rounded-md p-1 bg-surface-3",
        line: "gap-1 shadow-[inset_0_-1px_0_var(--color-line-default)]",
      },
    },
    defaultVariants: {
      variant: "line",
    },
  }
)

// Tab bar container. variant: 'line'(default, underline indicator)|'default'(pill tabs inside a tray).
// TabsTrigger adapts its active/hover styles automatically from the parent list's variant.
function TabsList({
  className,
  variant,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant ?? "line"}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        // shared base
        "group/tab relative inline-flex items-center gap-2 whitespace-nowrap select-none cursor-pointer",
        "text-sm font-medium",
        "transition-[color,background-color] duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:shadow-focus focus-visible:rounded-md",
        "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

        // ── default variant — pill in a tray ──
        "group-data-[variant=default]/tabs-list:h-[calc(100%-2px)] group-data-[variant=default]/tabs-list:px-3 group-data-[variant=default]/tabs-list:rounded-md",
        "group-data-[variant=default]/tabs-list:text-content-secondary",
        "group-data-[variant=default]/tabs-list:not-disabled:not-data-active:hover:text-content-primary",
        "group-data-[variant=default]/tabs-list:disabled:text-content-disabled",
        "group-data-[variant=default]/tabs-list:data-active:bg-surface-2 group-data-[variant=default]/tabs-list:data-active:text-content-primary group-data-[variant=default]/tabs-list:data-active:shadow-1",

        // ── line variant — underline ──
        // reference: padding 12px 12px; margin-bottom -1px; rounded top md only
        "group-data-[variant=line]/tabs-list:px-3 group-data-[variant=line]/tabs-list:py-3 group-data-[variant=line]/tabs-list:-mb-px",
        "group-data-[variant=line]/tabs-list:rounded-t-md group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:text-content-secondary",
        "group-data-[variant=line]/tabs-list:not-disabled:not-data-active:hover:bg-surface-hover group-data-[variant=line]/tabs-list:not-disabled:not-data-active:hover:text-content-primary",
        "group-data-[variant=line]/tabs-list:disabled:text-content-disabled",
        "group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:text-content-primary group-data-[variant=line]/tabs-list:data-active:font-semibold",
        // underline indicator (line variant only)
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:inset-x-3 group-data-[variant=line]/tabs-list:after:bottom-0 group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:rounded-t-[2px]",
        "group-data-[variant=line]/tabs-list:after:bg-primary-700 group-data-[variant=line]/tabs-list:after:origin-center group-data-[variant=line]/tabs-list:after:scale-x-0",
        "group-data-[variant=line]/tabs-list:after:transition-transform group-data-[variant=line]/tabs-list:after:duration-normal group-data-[variant=line]/tabs-list:after:ease-emphasized",
        "group-data-[variant=line]/tabs-list:data-active:after:scale-x-100",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }


