"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "../../lib/utils"

interface ModalProps {
  open?: boolean
  onClose?: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  footer?: React.ReactNode
  closeOnOverlay?: boolean
  showCloseButton?: boolean
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
  showCloseButton = true,
  children,
  className,
}: ModalProps) {
  const hasHeader = Boolean(title || description || showCloseButton)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.()
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
            "fixed top-1/2 left-1/2 z-modal flex w-full max-w-[calc(100%-2rem)] sm:max-w-md max-h-[calc(100vh-96px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line-subtle bg-popover text-popover-foreground shadow-4 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
        >
          {hasHeader && (
            <header
              data-slot="modal-header"
              className="flex shrink-0 items-start justify-between gap-2 border-b border-line-subtle p-4"
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
                  className="mt-0.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-content-tertiary transition-colors hover:bg-surface-hover hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
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
              className="flex-1 overflow-auto p-4 text-xs leading-normal text-content-secondary"
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

export { Modal, type ModalProps }


