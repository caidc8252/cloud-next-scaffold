import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "../../lib/utils"

// Profile picture with image fallback to initials. size: 'sm'|'md'|'lg'|'xl' on the Avatar root.
function Avatar({
  className,
  size = "md",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "sm" | "md" | "lg" | "xl"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex shrink-0 rounded-full select-none overflow-hidden",
        size === "xl" && "size-12",
        size === "lg" && "size-9",
        size === "md" && "size-7",
        size === "sm" && "size-control-xs",
        className
      )}
      {...props}
    />
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

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-[var(--color-brand-mono)] text-content-inverse font-semibold",
        "group-data-[size=xl]/avatar:text-base group-data-[size=lg]/avatar:text-sm group-data-[size=md]/avatar:text-xs group-data-[size=sm]/avatar:text-xs",
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


