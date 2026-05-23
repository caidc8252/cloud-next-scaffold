import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const spinnerVariants = cva(
  "rounded-full border-2 border-line-default border-t-primary animate-spin",
  {
    variants: {
      size: {
        sm: "size-3.5",
        md: "size-4",
        lg: "size-5",
        xl: "size-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

interface SpinnerProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof spinnerVariants> {}

// Circular loading indicator with role="status". size: 'sm'(14px)|'md'(16px)|'lg'(20px)|'xl'(32px).
function Spinner({ className, size, ...props }: SpinnerProps) {
  return (
    <div
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
      style={{ animationDuration: "750ms" }}
      {...props}
    />
  )
}

export { Spinner, type SpinnerProps }


