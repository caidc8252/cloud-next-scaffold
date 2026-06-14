"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "../../lib/utils"

type ModalSize = "sm" | "md" | "lg" | "xl" | "fullscreen"

// TOMS v2.0 modal widths: sm 360 / md 480 (default) / lg 640 / xl 880;
// fullscreen leaves a 32px frame on every side. Mobile always caps at
// calc(100% - 2rem) via the base class.
const MODAL_SIZES: Record<ModalSize, string> = {
  sm: "sm:max-w-[360px]",
  md: "sm:max-w-[480px]",
  lg: "sm:max-w-[640px]",
  xl: "sm:max-w-[880px]",
  fullscreen: "max-w-none w-[calc(100vw-64px)] h-[calc(100vh-64px)] max-h-[calc(100vh-64px)]",
}

interface ModalProps {
  open?: boolean
  onClose?: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  closeOnOverlay?: boolean
  /**
   * Whether pressing Escape closes the modal. Default true.
   *
   * base-ui hardwires Escape handling on the Dialog root (there is no
   * `disableEscapeKey` prop — only `disablePointerDismissal` for the overlay),
   * so we suppress it here by inspecting the close reason and cancelling
   * base-ui's own dismissal. Set false for flows that must not be lost to a
   * stray keypress (multi-step forms, in-flight submits). This only gates
   * Escape — `closeOnOverlay` and `showCloseButton` stay independent. For a
   * dialog that forbids every casual dismissal, prefer <AlertDialog>.
   */
  closeOnEscape?: boolean
  showCloseButton?: boolean
  /** Width preset: 'sm'|'md'|'lg'|'xl'|'fullscreen'. Default 'md' (480px). */
  size?: ModalSize
  children?: React.ReactNode
  className?: string
}

function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  closeOnOverlay = true,
  closeOnEscape = true,
  showCloseButton = true,
  size = "md",
  children,
  className,
}: ModalProps) {
  const hasHeader = Boolean(title || description || showCloseButton)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen, eventDetails) => {
        if (isOpen) return
        // base-ui always handles Escape; intercept it here when disabled.
        // cancel() stops base-ui's own dismissal so the popup stays mounted.
        if (!closeOnEscape && eventDetails.reason === "escape-key") {
          eventDetails.cancel()
          return
        }
        onClose?.()
      }}
      disablePointerDismissal={!closeOnOverlay}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          data-slot="modal-overlay"
          className="fixed inset-0 isolate z-modal bg-surface-overlay duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          data-slot="modal-content"
          className={cn(
            "fixed top-1/2 left-1/2 z-modal flex w-full max-w-[calc(100%-2rem)] max-h-[calc(100vh-96px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line-subtle bg-popover text-popover-foreground shadow-1 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            MODAL_SIZES[size],
            className
          )}
        >
          {hasHeader && (
            <header
              data-slot="modal-header"
              className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-5 py-3.5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {title && (
                  <DialogPrimitive.Title
                    data-slot="modal-title"
                    className="text-md font-semibold leading-tight text-content-primary"
                  >
                    {title}
                  </DialogPrimitive.Title>
                )}
                {description && (
                  <DialogPrimitive.Description
                    data-slot="modal-description"
                    className="text-xs leading-normal text-content-secondary"
                  >
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              {showCloseButton && (
                <DialogPrimitive.Close
                  data-slot="modal-close"
                  className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
                >
                  <XIcon size={13} />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </header>
          )}
          {children !== undefined && children !== null && children !== false && (
            <div
              data-slot="modal-body"
              className="flex-1 overflow-auto p-5 text-xs leading-normal text-content-secondary"
            >
              {children}
            </div>
          )}
          {footer && (
            <footer
              data-slot="modal-footer"
              className="flex shrink-0 flex-col-reverse gap-2 border-t border-line-subtle bg-muted px-4 py-3 sm:flex-row sm:justify-end"
            >
              {footer}
            </footer>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export { Modal, type ModalProps, type ModalSize }

