"use client"

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"
import { cn } from "../../lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ComboboxProps {
  options: ComboboxOption[]
  /** Single-select: a string. Multi-select (with `multiple`): a string[]. */
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  size?: "sm" | "default"
  invalid?: boolean
  /** Enable multi-select: value/onValueChange use string[]; picking toggles a value and keeps the popover open. */
  multiple?: boolean
  className?: string
}

// Searchable single-select dropdown. options: {value, label, disabled?}[] — filtered by label text.
// invalid: red border/ring error state. size: 'sm'|'default' controls trigger height.
// Prefer over Select when the option list is long enough to benefit from a search box.
//
// Wraps base-ui's Combobox. `value` is normalized to `option | null` so the underlying Root is
// always controlled — passing an undefined `value` never flips it uncontrolled→controlled.
function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "",
  disabled,
  size = "default",
  invalid,
  multiple,
  className,
}: ComboboxProps) {
  const selectedValues = multiple && Array.isArray(value) ? value : []
  const selectedSingle: ComboboxOption | null =
    !multiple && typeof value === "string"
      ? options.find((option) => option.value === value) ?? null
      : null
  const selectedMulti: ComboboxOption[] = multiple
    ? options.filter((option) => selectedValues.includes(option.value))
    : []

  return (
    <ComboboxPrimitive.Root
      items={options}
      multiple={multiple}
      value={multiple ? selectedMulti : selectedSingle}
      onValueChange={(option) => {
        if (multiple) {
          onValueChange?.((option as ComboboxOption[]).map((o) => o.value))
        } else if (option) {
          onValueChange?.((option as ComboboxOption).value)
        }
      }}
      isItemEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
    >
      <ComboboxPrimitive.Trigger
        data-slot="combobox-trigger"
        data-size={size}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-md border border-line-default bg-surface-2 pl-2.5 pr-2 text-sm whitespace-nowrap transition-colors outline-none select-none cursor-pointer hover:border-line-strong focus-visible:border-line-focus focus-visible:ring-2 focus-visible:ring-line-focus/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error-strong aria-invalid:ring-2 aria-invalid:ring-error/20 dark:bg-surface-3/30 data-[size=default]:h-control-md data-[size=sm]:h-control-sm data-placeholder:text-content-tertiary",
          className
        )}
      >
        <span className="flex-1 truncate text-left">
          {multiple ? (
            selectedMulti.length > 0 ? (
              selectedMulti.map((o) => o.label).join(", ")
            ) : (
              <span className="text-content-tertiary">{placeholder}</span>
            )
          ) : (
            <ComboboxPrimitive.Value placeholder={placeholder} />
          )}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-content-tertiary pointer-events-none" />
      </ComboboxPrimitive.Trigger>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          className="isolate z-popover"
        >
          <ComboboxPrimitive.Popup
            data-slot="combobox-content"
            className={cn(
              "w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-hidden rounded-md",
              "bg-surface-2 border border-line-default shadow-4 text-content-primary",
              "duration-100",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
            )}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-line-subtle px-2.5">
              <SearchIcon className="size-3.5 shrink-0 text-content-tertiary pointer-events-none" />
              <ComboboxPrimitive.Input
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-sm text-content-primary placeholder:text-content-tertiary outline-none"
              />
            </div>

            {/* Options list */}
            {emptyText && (
              <ComboboxPrimitive.Empty className="py-4 text-center text-sm text-content-tertiary">
                {emptyText}
              </ComboboxPrimitive.Empty>
            )}
            <ComboboxPrimitive.List className="max-h-56 scroll-py-1 overflow-x-hidden overflow-y-auto p-1">
              {(option: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className="relative flex cursor-default items-center rounded-md py-1.5 pl-2.5 pr-8 text-sm outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-surface-hover"
                >
                  {option.label}
                  <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
                    <CheckIcon className="size-3.5 shrink-0" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { Combobox }
