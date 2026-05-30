import { useTheme } from "../../lib/theme"
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps, type ExternalToast } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Toast notification container. Place once in the root layout; call toast() anywhere to show a notification.
// Theme auto-tracks the app's light/dark preference. Accepts all ToasterProps (position, duration, richColors, etc.).
const TOAST_DURATION = 4_000

const Toaster = ({ ...props }: ToasterProps) => {
  const { preference: theme } = useTheme()

  return (
    <Sonner
      duration={TOAST_DURATION}
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-3.5 text-success" />,
        info:    <InfoIcon className="size-3.5 text-info" />,
        warning: <TriangleAlertIcon className="size-3.5 text-warning" />,
        error:   <OctagonXIcon className="size-3.5 text-error" />,
        loading: <Loader2Icon className="size-3.5 animate-spin text-content-tertiary" />,
      }}
      style={
        {
          "--normal-bg":     "var(--color-surface-2)",
          "--normal-text":   "var(--color-content-primary)",
          "--normal-border": "var(--color-line-default)",
          "--border-radius": "var(--radius-lg)",
          "--width":         "340px",
          "--toast-duration": `${TOAST_DURATION}ms`,
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:       "cn-toast cn-toast-countdown px-3 py-2.5 gap-2 text-xs shadow-3 font-sans items-start",
          icon:        "shrink-0 self-start mt-px [&_svg]:size-3.5",
          content:     "gap-0.5",
          title:       "text-xs font-medium text-content-primary leading-snug",
          description: "text-xs text-content-tertiary leading-snug",
          closeButton: "bg-transparent border-0 text-content-tertiary hover:text-content-primary",
        },
      }}
      {...props}
    />
  )
}

// Sync the countdown bar to each toast's real duration: callers set `duration` once and
// the CSS var follows, so a custom duration can never drift from the global default.
// Non-finite durations (loading/Infinity) skip the var, leaving no finite bar.
function withCountdown(data?: ExternalToast): ExternalToast {
  const duration = data?.duration ?? TOAST_DURATION
  if (!Number.isFinite(duration)) return data ?? {}
  return {
    ...data,
    style: { "--toast-duration": `${duration}ms`, ...data?.style } as React.CSSProperties,
  }
}

// Wrap sonner's toast so every variant routes its duration through withCountdown.
// Unwrapped methods (loading/promise/dismiss/custom/message) pass through unchanged.
const toast: typeof sonnerToast = Object.assign(
  (message: Parameters<typeof sonnerToast>[0], data?: ExternalToast) =>
    sonnerToast(message, withCountdown(data)),
  sonnerToast,
  {
    success: (message: Parameters<typeof sonnerToast.success>[0], data?: ExternalToast) =>
      sonnerToast.success(message, withCountdown(data)),
    info: (message: Parameters<typeof sonnerToast.info>[0], data?: ExternalToast) =>
      sonnerToast.info(message, withCountdown(data)),
    warning: (message: Parameters<typeof sonnerToast.warning>[0], data?: ExternalToast) =>
      sonnerToast.warning(message, withCountdown(data)),
    error: (message: Parameters<typeof sonnerToast.error>[0], data?: ExternalToast) =>
      sonnerToast.error(message, withCountdown(data)),
  },
)

export { Toaster, toast }


