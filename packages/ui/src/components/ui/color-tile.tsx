import * as React from "react"
import { cn } from "../../lib/utils"
import { categoricalColorIndex } from "../../lib/categorical-color"

// Square identity tile that shows a FULL label on a background color derived
// deterministically from its content (style-spec §2.3, §6.2). Sibling to
// <InitialsTile>: both are square rounded surfaces, but InitialsTile shows the
// computed initials on a neutral avatar surface, whereas ColorTile shows the
// whole label (e.g. a device-model code "N950" / "X900") wrapped inside the
// square, tinted by a stable hash of the content.
//
// The same label always lands on the same cat token; different labels may
// collide onto the same color — accepted, see categorical-color.ts.
//
// Soft-tint look: a pale same-hue fill paired with readable same-hue ink, from
// the `cat-*` token family (light + dark values baked into the tokens, so the
// theme cascade handles dark mode — no per-mode logic here). A shared neutral
// hairline (cat-line) frames every tile regardless of hue.

// Bucket → tone classes, indexed by categoricalColorIndex(). Written out in full
// (not built from a template) so the Tailwind scanner sees every utility — a
// dynamic name would make the tints silently vanish.
const TONE = [
  "bg-cat-1 text-cat-1-fg",
  "bg-cat-2 text-cat-2-fg",
  "bg-cat-3 text-cat-3-fg",
  "bg-cat-4 text-cat-4-fg",
  "bg-cat-5 text-cat-5-fg",
  "bg-cat-6 text-cat-6-fg",
] as const

// Square sizes — width only; `aspect-square` (in the base classes) derives the
// height, so callers can also pass `className="w-full"` to get a responsive
// square that fills its container (e.g. a sticky summary preview).
const SIZE = {
  sm: "w-10 rounded-lg text-xs",
  md: "w-14 rounded-lg text-sm",
  lg: "w-20 rounded-xl text-base",
} as const

interface ColorTileProps {
  // Full text shown inside the tile; wraps and is centered.
  label: string
  // String fed to the color hash. Defaults to `label` — override when the
  // displayed text differs from the identity you want the color keyed on.
  colorSeed?: string
  size?: keyof typeof SIZE
  className?: string
}

function ColorTile({ label, colorSeed, size = "md", className }: ColorTileProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid aspect-square shrink-0 place-items-center overflow-hidden border border-cat-line p-1",
        "text-center leading-tight font-semibold break-words whitespace-normal",
        SIZE[size],
        TONE[categoricalColorIndex(colorSeed ?? label)],
        className,
      )}
    >
      {label}
    </span>
  )
}

export { ColorTile, type ColorTileProps }
