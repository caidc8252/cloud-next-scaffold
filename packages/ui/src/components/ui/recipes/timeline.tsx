"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../../lib/utils"

// Timeline — vertical event log (device history, audit trails, ticket activity).
// Port of the TOMS DS timeline spec (spec/timeline.html + extensions.css,
// `.tds-timeline*` rules). Display-only: no interactivity, no data fetching.
//
// Anatomy (one item):
//
//   [marker column]  [content column]
//   ┌ 24px node ┐    title …………………………… time   <- TimelineHeader (time right)
//   │    rail   │    description                <- TimelineDescription
//   │  (2px)    │    actor                      <- TimelineActor
//   └───────────┘
//
// Two root modes, combinable:
//   density: "default" | "compact"  -> vertical rhythm (pb-5 vs pb-3) + title size
//   stacked: boolean                -> time placement; true = "time · actor" row
//                                      below the title (TimelineTimeRow), false =
//                                      time at the right edge of the header
//
// Two marker styles, chosen automatically by TimelineMarker:
//   no children -> ring-dot (12px hollow circle, ring takes the tone color)
//   children    -> icon node (24px tinted circle wrapping the given icon)
//
// Two usage levels:
//   `items` prop -> shortcut for plain event lists (see TimelineEntry)
//   slot children -> full control; put anything in TimelineContent (badges,
//   links, code). Both render through the same slot components.
//
// Spec fidelity notes:
//   - The connecting rail is the marker column itself: the column stretches to
//     the full item height (self-stretch) and the rail fills the space below the
//     node (flex-1). The inter-item gap lives on TimelineContent's padding-bottom,
//     so the rail runs continuously into the next item with no absolute
//     positioning and no arbitrary Tailwind values (lint bans most of those).
//   - Known deviation: the spec's ring-dot uses a 2.5px ring; we use border-2
//     (2px) because the border scale has no 2.5 step.
//   - The spec's `primary` tone maps to the local accent-* ramp (values match
//     the upstream accent tokens verbatim), not the primary-* gray-blue ramp.

type TimelineTone = NonNullable<VariantProps<typeof timelineMarkerVariants>["tone"]>
type TimelineDensity = "default" | "compact"

// Root modes flow to the slots through React context rather than group-variant
// CSS. With Tailwind v4's :where()-wrapped variants every rule has equal
// specificity, so "compact pb-3" vs "last-item pb-0" would be decided by
// stylesheet order — fragile. Context lets each slot emit exactly one padding /
// size class, which also keeps tailwind-merge overrides predictable. The
// default value below makes slots render sensibly even outside a <Timeline>.
interface TimelineContextValue {
  density: TimelineDensity
  stacked: boolean
}

const TimelineContext = React.createContext<TimelineContextValue>({
  density: "default",
  stacked: false,
})

// Marker node. `dot` is the ring-dot (hollow circle on the rail), `icon` is the
// 24px tinted circle that wraps a consumer-provided icon. Tones mirror the TOMS
// spec's data-tone vocabulary and align with Badge's `tone` prop; `primary`
// maps to the local accent ramp (see fidelity notes above). The variant is not
// a prop — TimelineMarker derives it from the presence of children.
const timelineMarkerVariants = cva("grid size-6 place-items-center", {
  variants: {
    variant: {
      dot: "",
      icon: "rounded-full border-2 bg-surface-2 [&_svg:not([class*='size-'])]:size-3",
    },
    tone: {
      neutral: "",
      primary: "",
      success: "",
      warning: "",
      error: "",
      info: "",
    },
  },
  compoundVariants: [
    { variant: "dot", tone: "neutral", class: "text-content-tertiary" },
    { variant: "dot", tone: "primary", class: "text-accent-600" },
    { variant: "dot", tone: "success", class: "text-success" },
    { variant: "dot", tone: "warning", class: "text-warning" },
    { variant: "dot", tone: "error", class: "text-error" },
    { variant: "dot", tone: "info", class: "text-info" },
    { variant: "icon", tone: "neutral", class: "border-line-strong text-content-tertiary" },
    { variant: "icon", tone: "primary", class: "border-accent-600 bg-accent-50 text-accent-600" },
    { variant: "icon", tone: "success", class: "border-success bg-success-bg text-success" },
    // Spec keeps warning glyphs at the darker 700 step for contrast on the tinted bg.
    { variant: "icon", tone: "warning", class: "border-warning bg-warning-bg text-warning-strong" },
    { variant: "icon", tone: "error", class: "border-error bg-error-bg text-error" },
    { variant: "icon", tone: "info", class: "border-info bg-info-bg text-info" },
  ],
  defaultVariants: { variant: "dot", tone: "neutral" },
})

// Entry shape for the `items` shortcut. `icon` switches the marker to the icon
// node; omit it for the ring-dot.
interface TimelineEntry {
  // React key; falls back to the array index.
  id?: string | number
  title: React.ReactNode
  // Display text of the timestamp (rendered mono + tabular-nums).
  time?: React.ReactNode
  // Machine-readable value forwarded to the <time dateTime> attribute.
  dateTime?: string
  // In stacked mode joins `time` as "time · actor"; otherwise rendered after the
  // description (write the "by " prefix yourself if the spec layout needs it).
  actor?: React.ReactNode
  description?: React.ReactNode
  tone?: TimelineTone
  icon?: React.ReactNode
}

interface TimelineProps extends React.ComponentProps<"ul"> {
  // Vertical rhythm + title size. `compact` is for dense audit logs.
  density?: TimelineDensity
  // true -> time/actor stack below the title (use TimelineTimeRow);
  // false -> time sits at the right edge of the header.
  stacked?: boolean
  // Shortcut: render entries through the slot components. When set, `children` is ignored.
  items?: TimelineEntry[]
}

// Vertical event log (device history, audit trails, ticket activity), ported from
// the TOMS DS timeline spec. Tone-coded markers, mono timestamps, connecting rail.
//
// Slot usage:
//   <Timeline density="compact" stacked>
//     <TimelineItem>
//       <TimelineMarker tone="success" />                      // ring-dot
//       <TimelineMarker tone="warning"><BatteryLow /></TimelineMarker>  // icon node
//       <TimelineContent>
//         <TimelineHeader>
//           <TimelineTitle>Firmware updated</TimelineTitle>
//           <TimelineTime dateTime="...">2026-06-03 14:22:08</TimelineTime>   // time right
//           <TimelineTimeRow>                                   // stacked: time below
//             <TimelineTime>14:22:08</TimelineTime>
//             <TimelineActor>ops-svc</TimelineActor>
//           </TimelineTimeRow>
//         </TimelineHeader>
//         <TimelineDescription>Push completed.</TimelineDescription>
//         <TimelineActor>by ops-svc</TimelineActor>             // time right: actor last
//       </TimelineContent>
//     </TimelineItem>
//   </Timeline>
//
// Shortcut for plain event lists: <Timeline items={entries} stacked />.
function Timeline({
  density = "default",
  stacked = false,
  items,
  className,
  children,
  ...props
}: TimelineProps) {
  const context = React.useMemo(() => ({ density, stacked }), [density, stacked])
  return (
    <TimelineContext.Provider value={context}>
      <ul
        data-slot="timeline"
        data-density={density}
        data-stacked={stacked ? "" : undefined}
        className={cn("flex flex-col", className)}
        {...props}
      >
        {items
          ? items.map((entry, index) => (
              <TimelineEntryItem key={entry.id ?? index} entry={entry} />
            ))
          : children}
      </ul>
    </TimelineContext.Provider>
  )
}

// One event row. The named group is what the last-item rules hook onto:
// the rail (in TimelineMarker) and the bottom padding (in TimelineContent)
// both switch off via group-last/timeline-item.
function TimelineItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="timeline-item"
      className={cn("group/timeline-item flex gap-3", className)}
      {...props}
    />
  )
}

interface TimelineMarkerProps extends React.ComponentProps<"span"> {
  tone?: TimelineTone
  // children: an icon to render inside the 24px node; omit for the ring-dot.
}

// Marker column: the node plus the rail segment below it. The column stretches to
// the full item height (incl. the gap that lives on TimelineContent's padding),
// so the rail runs continuously into the next item. Hidden after the last item.
// `className` and extra props land on the node span; the column wrapper is fixed.
// The whole column is decorative (aria-hidden) — meaning lives in the content.
function TimelineMarker({ tone = "neutral", className, children, ...props }: TimelineMarkerProps) {
  const variant = React.Children.count(children) > 0 ? "icon" : "dot"
  return (
    <div className="flex w-6 shrink-0 flex-col items-center self-stretch">
      <span
        data-slot="timeline-marker"
        data-variant={variant}
        aria-hidden
        className={cn(timelineMarkerVariants({ variant, tone }), className)}
        {...props}
      >
        {variant === "icon" ? (
          children
        ) : (
          <span className="size-3 rounded-full border-2 border-current bg-surface-2" />
        )}
      </span>
      <span aria-hidden className="w-0.5 flex-1 bg-line-default group-last/timeline-item:hidden" />
    </div>
  )
}

function TimelineContent({ className, ...props }: React.ComponentProps<"div">) {
  const { density } = React.useContext(TimelineContext)
  return (
    <div
      data-slot="timeline-content"
      className={cn(
        "min-w-0 flex-1 pt-0.5",
        density === "compact" ? "pb-3" : "pb-5",
        "group-last/timeline-item:pb-0",
        className,
      )}
      {...props}
    />
  )
}

function TimelineHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { stacked } = React.useContext(TimelineContext)
  return (
    <div
      data-slot="timeline-header"
      className={cn(
        stacked ? "block" : "flex flex-wrap items-baseline justify-between gap-3",
        className,
      )}
      {...props}
    />
  )
}

function TimelineTitle({ className, ...props }: React.ComponentProps<"span">) {
  const { density } = React.useContext(TimelineContext)
  return (
    <span
      data-slot="timeline-title"
      className={cn(
        "font-medium text-content-primary",
        density === "compact" ? "text-md" : "text-md",
        className,
      )}
      {...props}
    />
  )
}

function TimelineTime({ className, ...props }: React.ComponentProps<"time">) {
  return (
    <time
      data-slot="timeline-time"
      className={cn(
        "font-mono text-xs whitespace-nowrap text-content-tertiary tabular-nums",
        className,
      )}
      {...props}
    />
  )
}

// Marks descendants (currently TimelineActor) as sitting on the inline row.
const TimeRowContext = React.createContext(false)

// Stacked layout's "time · actor" line under the title. Intersperses a dot
// separator between its children (the spec does this with CSS `content`).
function TimelineTimeRow({ className, children, ...props }: React.ComponentProps<"div">) {
  const parts = React.Children.toArray(children)
  return (
    <TimeRowContext.Provider value={true}>
      <div
        data-slot="timeline-time-row"
        className={cn("mt-0.5 flex items-baseline gap-2", className)}
        {...props}
      >
        {parts.flatMap((part, index) =>
          index === 0
            ? [part]
            : [
                <span key={`separator-${index}`} aria-hidden className="text-content-tertiary">
                  ·
                </span>,
                part,
              ],
        )}
      </div>
    </TimeRowContext.Provider>
  )
}

function TimelineDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-description"
      className={cn("mt-0.5 text-md leading-normal text-content-secondary", className)}
      {...props}
    />
  )
}

function TimelineActor({ className, ...props }: React.ComponentProps<"span">) {
  const isInTimeRow = React.useContext(TimeRowContext)
  return (
    <span
      data-slot="timeline-actor"
      className={cn(
        "font-mono text-xs text-content-tertiary",
        !isInTimeRow && "mt-1 block",
        className,
      )}
      {...props}
    />
  )
}

// Renders one `items` entry through the slot components, honoring the root's
// stacked mode: stacked puts time/actor in a TimelineTimeRow under the title,
// time-right puts the time in the header and the actor after the description.
function TimelineEntryItem({ entry }: { entry: TimelineEntry }) {
  const { stacked } = React.useContext(TimelineContext)
  const time =
    entry.time != null ? (
      <TimelineTime dateTime={entry.dateTime}>{entry.time}</TimelineTime>
    ) : null
  const actor = entry.actor != null ? <TimelineActor>{entry.actor}</TimelineActor> : null
  return (
    <TimelineItem>
      <TimelineMarker tone={entry.tone}>{entry.icon}</TimelineMarker>
      <TimelineContent>
        <TimelineHeader>
          <TimelineTitle>{entry.title}</TimelineTitle>
          {stacked ? (
            time || actor ? (
              <TimelineTimeRow>
                {time}
                {actor}
              </TimelineTimeRow>
            ) : null
          ) : (
            time
          )}
        </TimelineHeader>
        {entry.description != null ? (
          <TimelineDescription>{entry.description}</TimelineDescription>
        ) : null}
        {!stacked ? actor : null}
      </TimelineContent>
    </TimelineItem>
  )
}

export {
  Timeline,
  TimelineItem,
  TimelineMarker,
  TimelineContent,
  TimelineHeader,
  TimelineTitle,
  TimelineTime,
  TimelineTimeRow,
  TimelineDescription,
  TimelineActor,
  timelineMarkerVariants,
  type TimelineTone,
  type TimelineEntry,
  type TimelineProps,
}
