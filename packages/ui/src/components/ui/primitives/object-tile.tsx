import * as React from "react"
import { cn } from "../../../lib/utils"
import { categoricalColorIndex } from "../../../lib/categorical-color"

// Square, filled entity/object tile — a logo / identity mark for companies, apps,
// device models, etc. (TOMS DS 2.0; style-spec §2.3, §6.2). Consolidates the old
// InitialsTile + ColorTile: one tile that shows EITHER a glyph, name-derived
// initials, or a short code, on EITHER a neutral avatar surface or a categorical
// content-hashed tint. Always square, tinted same-hue fill, soft same-hue border,
// radius 12 (--radius-lg).
//
// Distinct from <Avatar>: Avatar is a CIRCULAR profile picture with an image +
// caller-supplied fallback. ObjectTile is a SQUARE surface with no image — it
// renders its own content (glyph / initials / code). Use Avatar for round profile
// pictures, ObjectTile for square brand/identity/object marks.
//
// Decorative by design (aria-hidden): the tile mirrors text the consumer already
// renders accessibly nearby, so it carries no accessible name of its own.

// Bucket → tone classes for the `auto` (categorical) tone, indexed by
// categoricalColorIndex(). Written out in full (not built from a template) so the
// Tailwind scanner sees every utility — a dynamic name would make the tints
// silently vanish. Copied verbatim from the retired ColorTile.
const TONE = [
  "bg-cat-1 text-cat-1-fg",
  "bg-cat-2 text-cat-2-fg",
  "bg-cat-3 text-cat-3-fg",
  "bg-cat-4 text-cat-4-fg",
  "bg-cat-5 text-cat-5-fg",
  "bg-cat-6 text-cat-6-fg",
] as const

// Square sizes — all radius 12 (rounded-lg → --radius-lg is 12px in this repo).
// sm 32 / md 40 (canonical) / lg 48.
const SIZE = {
  sm: "size-8 rounded-lg",
  md: "size-10 rounded-lg",
  lg: "size-12 rounded-lg",
} as const

// Glyph (icon) and initials sizing per tile size. Canonical md → 20px glyph
// (size-5) / text-md initials.
const ICON_SIZE = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const

const INITIALS_SIZE = {
  sm: "text-xs",
  md: "text-md",
  lg: "text-base",
} as const

// First letters of the first two words. Splits on whitespace and the separators
// common in app names / package ids (. + _ - /), so "Acme Corp" → "AC".
// Moved here from the retired InitialsTile.
function initialsFromName(name: string): string {
  const words = name.split(/[\s.+_/-]+/).filter(Boolean)
  if (words.length === 0) return "?"
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase()
}

interface ObjectTileProps {
  // Exactly one of these three picks the content mode:
  // - icon: a glyph node (~20px at md), centered as-is.
  // - name: derived to 2 initials via initialsFromName.
  // - label: a short code shown whole (fluid font so multi-char codes fit).
  icon?: React.ReactNode
  name?: string
  label?: string
  // Surface: neutral avatar tokens (default) or a categorical content hash.
  tone?: "neutral" | "auto"
  // Seed for the `auto` tone hash. Defaults to name ?? label — override when the
  // displayed text differs from the identity you want the color keyed on.
  colorSeed?: string
  size?: keyof typeof SIZE
  className?: string
}

function ObjectTile({
  icon,
  name,
  label,
  tone = "neutral",
  colorSeed,
  size = "md",
  className,
}: ObjectTileProps) {
  const toneClasses =
    tone === "auto"
      ? cn(TONE[categoricalColorIndex(colorSeed ?? name ?? label ?? "")], "border border-cat-line")
      : "bg-avatar-bg text-avatar-fg border border-line-subtle"

  return (
    <span
      aria-hidden
      className={cn(
        // `@container` makes the tile a size-query context so a label's cqw font
        // references the tile's own width (label mode only).
        "@container grid shrink-0 place-items-center overflow-hidden font-semibold",
        SIZE[size],
        toneClasses,
        className,
      )}
    >
      {icon != null ? (
        <span className={cn("grid place-items-center [&>svg]:size-full", ICON_SIZE[size])}>{icon}</span>
      ) : name != null ? (
        <span className={INITIALS_SIZE[size]}>{initialsFromName(name)}</span>
      ) : label != null ? (
        // Fluid font: ~28% of the tile width, clamped 8px–32px, so a multi-char
        // code stays whole at any size (carried over from the retired ColorTile).
        <span className="px-1 text-center leading-tight font-semibold break-words whitespace-normal text-[clamp(0.5rem,28cqw,2rem)]">
          {label}
        </span>
      ) : null}
    </span>
  )
}

export { ObjectTile, type ObjectTileProps }
