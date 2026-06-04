import * as React from "react"
import { cn } from "../../lib/utils"

// Square, neutral identity tile that derives initials from a name — a logo /
// icon placeholder for companies, apps, people, etc. (style-spec §2.3, §6.2).
//
// Distinct from <Avatar>: Avatar is a CIRCULAR profile picture with an image +
// caller-supplied fallback; InitialsTile is a SQUARE rounded surface-3 block
// that has no image and computes its own initials. Use Avatar for round
// profile pictures, InitialsTile for square brand/identity marks.

const SIZE = {
  xs: "size-7 rounded-md text-xs",
  sm: "size-8 rounded-lg text-xs",
  md: "size-10 rounded-lg text-sm",
  lg: "size-12 rounded-xl text-base",
} as const

// First letters of the first two words. Splits on whitespace and the separators
// common in app names / package ids (. + _ - /), so "com.acme.pos" → "CP".
function initialsFromName(name: string): string {
  const words = name.split(/[\s.+_/-]+/).filter(Boolean)
  if (words.length === 0) return "?"
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase()
}

interface InitialsTileProps {
  name: string
  size?: keyof typeof SIZE
  className?: string
}

function InitialsTile({ name, size = "sm", className }: InitialsTileProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center bg-surface-3 font-semibold text-content-secondary",
        SIZE[size],
        className,
      )}
    >
      {initialsFromName(name)}
    </span>
  )
}

export { InitialsTile, type InitialsTileProps }
