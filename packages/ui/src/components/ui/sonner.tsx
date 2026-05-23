import { useTheme } from "../../lib/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Toast notification container. Place once in the root layout; call toast() anywhere to show a notification.
// Theme auto-tracks the app's light/dark preference. Accepts all ToasterProps (position, duration, richColors, etc.).
const Toaster = ({ ...props }: ToasterProps) => {
  const { preference: theme } = useTheme()

  return (
    <Sonner
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
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:       "cn-toast px-3 py-2.5 gap-2 text-xs shadow-3 font-sans items-start",
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

export { Toaster }


