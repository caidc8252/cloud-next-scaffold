import * as React from "react"

import { cn } from "../../lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  showCount?: boolean
}

// Multi-line text input field. showCount: displays a character counter when maxLength is set.
function Textarea({
  className,
  showCount,
  maxLength,
  value,
  defaultValue,
  onChange,
  ...props
}: TextareaProps) {
  const isControlled = value !== undefined
  const [uncontrolledCount, setUncontrolledCount] = React.useState(
    defaultValue !== undefined ? String(defaultValue).length : 0
  )
  const count = isControlled ? String(value ?? "").length : uncontrolledCount

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isControlled) setUncontrolledCount(e.target.value.length)
    onChange?.(e)
  }

  const textarea = (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-line-default bg-surface-2 p-3 text-sm resize-y transition-colors outline-none placeholder:text-content-tertiary focus-visible:border-line-focus focus-visible:ring-2 focus-visible:ring-line-focus/30 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:opacity-50 aria-invalid:border-error-strong aria-invalid:ring-2 aria-invalid:ring-error/20 dark:bg-surface-3/30 dark:disabled:bg-surface-3/80 dark:aria-invalid:border-error-strong/50 dark:aria-invalid:ring-error/40",
        className
      )}
      maxLength={maxLength}
      value={value}
      defaultValue={defaultValue}
      onChange={showCount ? handleChange : onChange}
      {...props}
    />
  )

  if (!showCount) return textarea

  const atLimit = maxLength !== undefined && count >= maxLength
  const nearLimit = maxLength !== undefined && count >= maxLength * 0.9

  return (
    <div className="w-full">
      {textarea}
      <div className="mt-1 flex justify-end">
        <span
          className={cn(
            "text-xs tabular-nums text-content-tertiary transition-colors",
            nearLimit && "text-warning-strong",
            atLimit && "text-error-strong"
          )}
        >
          {maxLength !== undefined ? `${count} / ${maxLength}` : count}
        </span>
      </div>
    </div>
  )
}

export { Textarea }
export type { TextareaProps }


