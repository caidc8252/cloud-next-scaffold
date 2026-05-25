"use client"

import * as React from "react"
import { MinusIcon, PlusIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./input-group"

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  inputClassName?: string
  "aria-label"?: string
  decrementLabel?: string
  incrementLabel?: string
}

// Numeric stepper with +/- buttons around an input. Clamps value to [min, max]
// and disables the boundary button when reached.
// Keyboard on the input: ArrowUp/Down ±step, PageUp/Down ±step*10, Home/End jump to min/max.
function Stepper({
  value,
  onChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  disabled,
  id,
  name,
  className,
  inputClassName,
  "aria-label": ariaLabel,
  decrementLabel = "Decrement",
  incrementLabel = "Increment",
}: StepperProps) {
  const [draft, setDraft] = React.useState(() => String(value))
  const focusedRef = React.useRef(false)

  // External value updates only overwrite the draft when the input is unfocused,
  // so mid-typing keystrokes do not stomp on what the user is entering.
  React.useEffect(() => {
    if (!focusedRef.current) setDraft(String(value))
  }, [value])

  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  const commit = (next: number) => {
    if (!Number.isFinite(next)) return
    const clamped = clamp(next)
    setDraft(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  const atMin = value <= min
  const atMax = value >= max

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault()
        commit(value + step)
        break
      case "ArrowDown":
        e.preventDefault()
        commit(value - step)
        break
      case "PageUp":
        e.preventDefault()
        commit(value + step * 10)
        break
      case "PageDown":
        e.preventDefault()
        commit(value - step * 10)
        break
      case "Home":
        if (Number.isFinite(min)) {
          e.preventDefault()
          commit(min)
        }
        break
      case "End":
        if (Number.isFinite(max)) {
          e.preventDefault()
          commit(max)
        }
        break
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDraft(raw)
    if (raw === "" || raw === "-") return
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) {
      const clamped = clamp(parsed)
      if (clamped !== value) onChange(clamped)
    }
  }

  const handleBlur = () => {
    focusedRef.current = false
    const parsed = Number(draft)
    if (draft === "" || !Number.isFinite(parsed)) {
      setDraft(String(value))
      return
    }
    const clamped = clamp(parsed)
    setDraft(String(clamped))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <InputGroup
      data-slot="stepper"
      data-disabled={disabled || undefined}
      className={className}
    >
      <InputGroupAddon align="inline-start">
        <InputGroupButton
          size="icon-xs"
          onClick={() => commit(value - step)}
          disabled={disabled || atMin}
          aria-label={decrementLabel}
          tabIndex={-1}
        >
          <MinusIcon />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-label={ariaLabel}
        aria-valuenow={value}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        value={draft}
        disabled={disabled}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          focusedRef.current = true
        }}
        onBlur={handleBlur}
        className={cn("text-center", inputClassName)}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          onClick={() => commit(value + step)}
          disabled={disabled || atMax}
          aria-label={incrementLabel}
          tabIndex={-1}
        >
          <PlusIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

export { Stepper, type StepperProps }
