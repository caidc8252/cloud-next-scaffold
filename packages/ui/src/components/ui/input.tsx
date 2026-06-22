"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "../../lib/utils"
import { autofillFix } from "./_field"

const inputSizeClass: Record<string, string> = {
  sm: "h-control-sm px-cx-sm",
  md: "h-control-md px-cx-md",
  lg: "h-control-lg text-base px-cx-lg",
}

// TOMS v2.0 validation states beyond invalid: tone-500 border, tone/30 focus ring.
const validationClass: Record<string, string> = {
  warn: "border-warning-500 focus-visible:border-warning-500 focus-visible:ring-warning/30",
  ok: "border-success-500 focus-visible:border-success-500 focus-visible:ring-success/30",
}

// Filled variant (TOMS v2.0): tonal fill for dense toolbars / nested forms;
// border appears only on focus, background returns to surface-2.
const filledClass =
  "bg-surface-3 border-transparent hover:bg-surface-hover focus-visible:bg-surface-2 dark:bg-surface-3 dark:hover:bg-surface-hover"

interface InputProps extends Omit<React.ComponentProps<"input">, "prefix" | "suffix"> {
  invalid?: boolean
  inputSize?: "sm" | "md" | "lg"
  variant?: "default" | "filled"
  validation?: "warn" | "ok"
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

// Single-line text input field.
// invalid: red border/ring error state (also sets aria-invalid); takes priority over validation.
// validation: 'warn'|'ok' — amber/green border + matching focus ring (TOMS v2.0).
// variant: 'filled' — tonal surface-3 fill for dense toolbars; border only on focus.
// inputSize: 'sm'|'md'|'lg' — controls height/padding; distinct from the HTML size attribute.
// readOnly (native attr) renders surface-3 + secondary text automatically.
// prefix/suffix (ReactNode): wraps the input in a flex container with non-interactive adornments.
// ⚠️ 坑：有 prefix/suffix 时 className 落在里层 <input>，不是外层 flex 容器。布局类
// (mb-*/w-full/self-* 等) 会静默 no-op——外层容器才参与父级文档流。要控外层间距/宽度，
// 自己包一层 div 把布局类放外面，或改用 InputGroup（其 className 指向外层容器）。
function Input({
  className,
  type,
  invalid,
  inputSize,
  variant,
  validation,
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
        "h-control-md w-full min-w-0 rounded-md border border-line-default bg-surface-2 px-cx-md py-1 text-md transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-content-tertiary focus-visible:border-line-focus focus-visible:ring-2 focus-visible:ring-line-focus/30 read-only:bg-surface-3 read-only:text-content-secondary disabled:cursor-not-allowed disabled:bg-surface-3 disabled:opacity-50 aria-invalid:border-error-strong aria-invalid:ring-2 aria-invalid:ring-error/20 dark:bg-surface-3/30 dark:read-only:bg-surface-3/80 dark:disabled:bg-surface-3/80 dark:aria-invalid:border-error-strong/50 dark:aria-invalid:ring-error/40",
        autofillFix,
        variant === "filled" && filledClass,
        validation && !resolvedInvalid && validationClass[validation],
        inputSize && inputSizeClass[inputSize],
        // 有 prefix/suffix 时错误态由外层容器统一表达，内层 input 必须把自己的
        // aria-invalid 描边/ring 一并清掉——否则外层一圈、内层 aria-invalid:ring 又一圈，
        // 出现两层同心红 ring（border-0 只归零边框宽度，关不掉作为 box-shadow 的 ring）。
        (prefix || suffix) && "rounded-none border-0 bg-transparent focus-visible:ring-0 dark:bg-transparent aria-invalid:border-0 aria-invalid:ring-0",
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
        variant === "filled" &&
          "bg-surface-3 border-transparent hover:bg-surface-hover focus-within:bg-surface-2 dark:bg-surface-3 dark:hover:bg-surface-hover",
        validation && !resolvedInvalid && validation === "warn" &&
          "border-warning-500 focus-within:border-warning-500 focus-within:ring-warning/30",
        validation && !resolvedInvalid && validation === "ok" &&
          "border-success-500 focus-within:border-success-500 focus-within:ring-success/30",
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

