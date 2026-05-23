import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border py-3 px-4 has-[>svg]:grid has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:size-3.5 *:[svg]:mt-0.5 *:[svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-surface-2 border-line-default text-content-primary",
        info: "bg-info-bg border-info/25 text-info-strong *:[svg]:text-info-strong",
        warning: "bg-warning-bg border-warning/25 text-warning-strong *:[svg]:text-warning-strong",
        error: "bg-error-bg border-error/25 text-error-strong *:[svg]:text-error-strong",
        success: "bg-success-bg border-success/25 text-success-strong *:[svg]:text-success-strong",
        destructive: "bg-error-bg border-error/25 text-error-strong *:[svg]:text-error-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Highlighted message box for status feedback. variant: 'default'|'info'|'warning'|'error'|'success'|'destructive'. AlertAction renders a button in the top-right corner.
function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-sm font-semibold leading-tight group-has-[>svg]/alert:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-xs text-content-secondary mt-0.5 group-has-[>svg]/alert:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }


