import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "../../../lib/utils"

// CIRCULAR profile-picture primitive — image with a fallback to initials. This is
// the people/profile mark; its square sibling is <ObjectTile> (brand / entity /
// object tiles). Avatar stays `rounded-full`; ObjectTile is the square one.
//
// First letters of the first two words. Splits on whitespace and the separators
// common in names (. + _ - /), so "Acme Corp" → "AC". Replicated from
// ObjectTile's initialsFromName (object-tile.tsx does not export it) so Avatar can
// derive a 2-letter fallback from a `name` prop.
function initialsFromName(name: string): string {
  const words = name.split(/[\s.+_/-]+/).filter(Boolean)
  if (words.length === 0) return "?"
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase()
}

// Diameter per size. `md` is the canonical 40px (size-10) people tile; the other
// steps keep their existing values so current callers are unaffected.
const SIZE = {
  sm: "size-control-xs",
  md: "size-10",
  lg: "size-9",
  xl: "size-12",
} as const

type AvatarSize = keyof typeof SIZE

// Profile picture with image fallback to initials. size: 'sm'|'md'|'lg'|'xl'.
// Pass `name` to auto-derive 2-letter initials as the fallback, or supply your own
// <AvatarFallback> children (both work; explicit children win).
function Avatar({
  className,
  size = "md",
  name,
  children,
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: AvatarSize
  name?: string
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex shrink-0 rounded-full select-none overflow-hidden",
        SIZE[size],
        className
      )}
      {...props}
    >
      {children ?? (name != null ? <AvatarFallback>{initialsFromName(name)}</AvatarFallback> : null)}
    </AvatarPrimitive.Root>
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      {...props}
    />
  )
}

// Neutral identity tile: the dedicated avatar tokens (not brand ink) so the
// fallback reads as a calm identity surface and stays legible in dark mode.
function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-avatar-bg text-avatar-fg font-semibold",
        "group-data-[size=xl]/avatar:text-base group-data-[size=lg]/avatar:text-md group-data-[size=md]/avatar:text-xs group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

// Stacks multiple Avatar components with overlapping rings (e.g. participant lists).
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup }
