"use client"

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"
import { cn } from "../../../lib/utils"

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
  size?: "sm" | "md"
  invalid?: boolean
  /** Enable multi-select: value/onValueChange use string[]; picking toggles a value and keeps the popover open. */
  multiple?: boolean
  /**
   * Multi-select only: cap how many chips render in the trigger. When the selection exceeds
   * this number, the first `maxChips` chips show plus a trailing non-removable `+N` count pill.
   * Undefined (default) renders every selected chip and lets them wrap.
   */
  maxChips?: number
  className?: string
}

// Searchable single-select dropdown. options: {value, label, disabled?}[] — filtered by label text.
// invalid: red border/ring error state. size: 'sm'|'md' controls trigger height; defaults to md.
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
  size = "md",
  invalid,
  multiple,
  maxChips,
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

  // Multi-select: optionally cap visible chips, surfacing the overflow as a +N count pill.
  const hasMaxChips = multiple && typeof maxChips === "number" && maxChips >= 0
  const visibleChips = hasMaxChips ? selectedMulti.slice(0, maxChips) : selectedMulti
  const overflowCount = selectedMulti.length - visibleChips.length

  // Remove a single value from the multi-select array without opening/toggling the popover.
  const removeValue = (valueToRemove: string) => {
    onValueChange?.(selectedValues.filter((v) => v !== valueToRemove))
  }

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
        // Multi-select chips carry their own remove <button>. base-ui's Trigger renders a native
        // <button> by default, which would nest <button> inside <button> (invalid HTML → hydration
        // error). Render the multi-select trigger as a non-native <div> so the remove buttons are
        // valid descendants; base-ui keeps the combobox role / aria / keyboard wiring via
        // nativeButton={false}.
        {...(multiple ? { render: <div />, nativeButton: false } : {})}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-md border border-line-default bg-surface-2 pl-2.5 pr-2 text-md transition-colors outline-none select-none cursor-pointer hover:border-line-strong focus-visible:border-line-focus focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error-strong aria-invalid:ring-2 aria-invalid:ring-error/20 dark:bg-surface-3/30 data-placeholder:text-content-tertiary",
          // Single-select: fixed control height + single-line truncation.
          // Multi-select: grow with chips — min-height + vertical padding + wrapping.
          multiple
            ? "flex-wrap gap-1 py-1 data-[size=md]:min-h-control-md data-[size=sm]:min-h-control-sm"
            : "whitespace-nowrap data-[size=md]:h-control-md data-[size=sm]:h-control-sm",
          className
        )}
      >
        {multiple ? (
          selectedMulti.length > 0 ? (
            <span className="flex flex-1 flex-wrap items-center gap-1">
              {visibleChips.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 rounded-md border border-line-default bg-surface-3 px-1.5 py-0.5 text-xs text-content-secondary"
                >
                  {option.label}
                  <button
                    type="button"
                    aria-label={`remove ${option.label}`}
                    className="inline-flex items-center text-content-tertiary outline-none hover:text-content-primary"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      removeValue(option.value)
                    }}
                    // base-ui's trigger opens on mousedown, so stop it here too — otherwise
                    // removing a chip would also open the popup.
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <XIcon className="size-3 shrink-0" />
                  </button>
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="inline-flex items-center rounded-md border border-line-default bg-surface-3 px-1.5 py-0.5 text-xs text-content-secondary">
                  +{overflowCount}
                </span>
              )}
            </span>
          ) : (
            <span className="flex-1 truncate text-left text-content-tertiary">{placeholder}</span>
          )
        ) : (
          <span className="flex-1 truncate text-left">
            <ComboboxPrimitive.Value placeholder={placeholder} />
          </span>
        )}
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
                className="h-9 w-full bg-transparent text-md text-content-primary placeholder:text-content-tertiary outline-none"
              />
            </div>

            {/* Options list */}
            {emptyText && (
              <ComboboxPrimitive.Empty className="py-4 text-center text-md text-content-tertiary">
                {emptyText}
              </ComboboxPrimitive.Empty>
            )}
            <ComboboxPrimitive.List className="max-h-56 scroll-py-1 overflow-x-hidden overflow-y-auto p-1">
              {(option: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  value={option}
                  disabled={option.disabled}
                  className="relative flex cursor-default items-center rounded-md py-1.5 pl-2.5 pr-8 text-md outline-none select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-highlighted:bg-surface-hover"
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
