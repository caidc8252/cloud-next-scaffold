"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { Command as CommandPrimitive } from "cmdk"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"
import { cn } from "../../lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  size?: "sm" | "default"
  invalid?: boolean
  className?: string
}

// Searchable single-select dropdown. options: {value, label, disabled?}[] — filtered by label text client-side.
// invalid: red border/ring error state. size: 'sm'|'default' controls trigger height.
// Prefer over Select when the option list is long enough to benefit from a search box.
function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled,
  size = "default",
  invalid,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedLabel = options.find((o) => o.value === value)?.label

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-md border border-line-default bg-surface-2 pl-2.5 pr-2 text-sm whitespace-nowrap transition-colors outline-none select-none cursor-pointer",
          "hover:border-line-strong focus-visible:border-line-focus focus-visible:ring-2 focus-visible:ring-line-focus/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-error-strong aria-invalid:ring-2 aria-invalid:ring-error/20",
          "dark:bg-surface-3/30",
          size === "default" ? "h-control-md" : "h-control-sm",
          !selectedLabel && "text-content-tertiary",
          className
        )}
      >
        <span className="flex-1 truncate text-left">
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-content-tertiary pointer-events-none" />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          className="isolate z-popover"
        >
          <PopoverPrimitive.Popup
            className={cn(
              "w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-hidden rounded-md",
              "bg-surface-2 border border-line-default shadow-4 text-content-primary",
              "duration-100",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <CommandPrimitive>
              {/* Search input */}
              <div className="flex items-center gap-2 border-b border-line-subtle px-2.5">
                <SearchIcon className="size-3.5 shrink-0 text-content-tertiary pointer-events-none" />
                <CommandPrimitive.Input
                  placeholder={searchPlaceholder}
                  className="h-9 w-full bg-transparent text-sm text-content-primary placeholder:text-content-tertiary outline-none"
                />
              </div>

              {/* Options list */}
              <CommandPrimitive.List className="max-h-56 scroll-py-1 overflow-x-hidden overflow-y-auto p-1">
                <CommandPrimitive.Empty className="py-4 text-center text-sm text-content-tertiary">
                  {emptyText}
                </CommandPrimitive.Empty>
                {options.map((option) => (
                  <CommandPrimitive.Item
                    key={option.value}
                    // cmdk filters by this value; use label so search matches display text
                    value={option.label}
                    disabled={option.disabled}
                    onSelect={() => {
                      onValueChange?.(option.value)
                      setOpen(false)
                    }}
                    className="relative flex cursor-default items-center rounded-md py-1.5 pl-2.5 pr-8 text-sm outline-none select-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50 data-selected:bg-surface-hover"
                  >
                    {option.label}
                    {option.value === value && (
                      <CheckIcon className="absolute right-2 size-3.5 shrink-0" />
                    )}
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.List>
            </CommandPrimitive>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { Combobox }


