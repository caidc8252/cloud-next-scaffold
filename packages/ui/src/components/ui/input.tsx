"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "../../lib/utils"

const inputSizeClass: Record<string, string> = {
  sm: "h-control-sm text-xs px-cx-sm",
  md: "h-control-md px-cx-md",
  lg: "h-control-lg text-base px-cx-lg",
}

interface InputProps extends Omit<React.ComponentProps<"input">, "prefix" | "suffix"> {
  invalid?: boolean
  inputSize?: "sm" | "md" | "lg"
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

// Single-line text input field.
// invalid: red border/ring error state (also sets aria-invalid).
// inputSize: 'sm'|'md'|'lg' — controls height/padding; distinct from the HTML size attribute.
// prefix/suffix (ReactNode): wraps the input in a flex container with non-interactive adornments.
function Input({
  className,
  type,
  invalid,
  inputSize,
  prefix,
  suffix,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const resolvedInvalid = invalid || ariaInvalid

  const inputEl = (
    <InputPrimitive
      type={type}
      data-slot="input"
      aria-invalid={resolvedInvalid || undefined}
      className={cn(
        "h-control-md w-full min-w-0 rounded-md border border-line-default bg-surface-2 px-cx-md py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-content-tertiary focus-visible:border-line-focus focus-visible:ring-2 focus-visible:ring-line-focus/30 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:opacity-50 aria-invalid:border-error-strong aria-invalid:ring-2 aria-invalid:ring-error/20 md:text-sm dark:bg-surface-3/30 dark:disabled:bg-surface-3/80 dark:aria-invalid:border-error-strong/50 dark:aria-invalid:ring-error/40",
        inputSize && inputSizeClass[inputSize],
        (prefix || suffix) && "rounded-none border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )

  if (!prefix && !suffix) return inputEl

  return (
    <div
      className={cn(
        "flex items-center rounded-md border border-line-default bg-surface-2 transition-colors focus-within:border-line-focus focus-within:ring-2 focus-within:ring-line-focus/30 dark:bg-surface-3/30",
        resolvedInvalid && "border-error-strong ring-2 ring-error/20"
      )}
    >
      {prefix && (
        <span className="flex items-center pl-2.5 text-sm text-content-tertiary select-none">
          {prefix}
        </span>
      )}
      {inputEl}
      {suffix && (
        <span className="flex items-center pr-2.5 text-sm text-content-tertiary select-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

export { Input }


