import * as React from "react"

import { cn } from "../../../lib/utils"

type CardSize = "sm" | "md" | "lg"
type CardElevation = 0 | 1 | 2

interface CardProps extends React.ComponentProps<"div"> {
  size?: CardSize
  elevation?: CardElevation
  interactive?: boolean
}

const radiusClass: Record<CardSize, string> = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
}

const imgRadiusClass: Record<CardSize, string> = {
  sm: "*:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg",
  md: "*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  lg: "*:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
}

const elevationClass: Record<CardElevation, string> = {
  0: "shadow-none",
  1: "shadow-1",
  2: "shadow-3",
}

const slotPaddingClass =
  "group-data-[size=sm]/card:p-3 group-data-[size=md]/card:p-5 group-data-[size=lg]/card:p-6"

// CardHeader runs a denser vertical rhythm than the content slot: at md its
// top/bottom padding is 16px (py-4) while horizontal stays 20px (px-5). sm/lg
// keep the uniform slot padding.
const headerPaddingClass =
  "group-data-[size=sm]/card:p-3 group-data-[size=md]/card:px-5 group-data-[size=md]/card:py-3.5 group-data-[size=lg]/card:p-6"

// flush: drops the size-based slot padding for full-bleed content (tables, row
// lists) — rows then own their padding. Needed because the slot padding is a
// group-data variant class: a consumer's un-prefixed `p-0` can't override it
// (tailwind-merge won't dedupe across variants and the variant rule sorts later).
interface CardSlotProps extends React.ComponentProps<"div"> {
  flush?: boolean
}

// Bordered content container.
// size: 'sm'|'md'|'lg' — controls radius (8/12/16) and slot padding (12/20/24) uniformly.
// elevation: 0 flat / 1 rest (default) / 2 lifted — resting cards should stay at 1; 2 is for hover/popover.
// interactive: hover → border-line-strong + shadow-3 + cursor-pointer. Use only on truly clickable cards.
function Card({
  className,
  size = "md",
  elevation = 1,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col overflow-hidden bg-surface-2 border border-line-default text-md text-content-primary",
        radiusClass[size],
        imgRadiusClass[size],
        elevationClass[elevation],
        interactive &&
          "cursor-pointer transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-3",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, flush = false, ...props }: CardSlotProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min items-start gap-1 border-b border-line-subtle",
        !flush && headerPaddingClass,
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-md leading-snug font-semibold text-content-primary group-data-[size=sm]/card:text-md",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs leading-relaxed text-content-tertiary", className)}
      {...props}
    />
  )
}

// Header action slot: spans both header rows and centers vertically against
// the title/description block (team spec — not shadcn's self-start).
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-center justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, flush = false, ...props }: CardSlotProps) {
  return (
    <div
      data-slot="card-content"
      className={cn(!flush && slotPaddingClass, className)}
      {...props}
    />
  )
}

function CardFooter({ className, flush = false, ...props }: CardSlotProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-line-subtle",
        !flush && slotPaddingClass,
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

