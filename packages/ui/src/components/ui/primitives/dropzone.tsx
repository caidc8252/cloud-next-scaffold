"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, File as FileIcon, UploadCloud, X } from "lucide-react"
import { cn } from "../../../lib/utils"
import { Button } from "./button"
import { Progress } from "./progress"

// Presentation-only file-select UI. Emits picked `File[]`; it does NOT upload —
// the consumer wires the actual transfer via `@cloud/storage` and feeds back
// per-file status/progress to <FileRow>. No network, no env (capability split).

interface DropzoneProps {
  /** Called with the picked files. The consumer performs the upload. */
  onFiles: (files: File[]) => void
  /** Native input `accept` (e.g. "image/*,.bin"). Browser-side filter only. */
  accept?: string
  multiple?: boolean
  disabled?: boolean
  className?: string
  /** Custom inner content (pass your own translated prompt). Defaults to an icon. */
  children?: React.ReactNode
}

function Dropzone({ onFiles, accept, multiple, disabled, className, children }: DropzoneProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const emit = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (files.length) onFiles(files)
  }
  return (
    <label
      aria-disabled={disabled || undefined}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        if (!disabled) emit(e.dataTransfer.files)
      }}
      className={cn(
        "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-default bg-surface-2 px-6 py-8 text-center text-md text-content-tertiary transition-colors",
        !disabled && "hover:bg-surface-hover",
        dragActive && "border-primary-500 bg-primary-50",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          emit(e.target.files)
          e.currentTarget.value = ""
        }}
      />
      {children ?? <UploadCloud className="size-6" aria-hidden />}
    </label>
  )
}

function FileList({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-col gap-2", className)} {...props} />
}

type FileStatus = "pending" | "uploading" | "done" | "error"

interface FileRowProps {
  name: string
  /** Raw byte size; rendered human-readable (e.g. "2.0 KB"). */
  sizeBytes?: number
  status?: FileStatus
  /** 0–100; shown as a bar while `status === "uploading"`. */
  progress?: number
  /** Shown while `status === "error"` (pass a translated string). */
  error?: React.ReactNode
  onRemove?: () => void
  /** aria-label for the remove button (translate in the consumer). */
  removeLabel?: string
  className?: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ["KB", "MB", "GB", "TB"]
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}

function StatusGlyph({ status }: { status: FileStatus }) {
  if (status === "done") return <CheckCircle2 className="size-4 shrink-0 text-success-strong" aria-hidden />
  if (status === "error") return <AlertCircle className="size-4 shrink-0 text-error-strong" aria-hidden />
  return null
}

function FileRow({
  name,
  sizeBytes,
  status = "pending",
  progress,
  error,
  onRemove,
  removeLabel = "Remove",
  className,
}: FileRowProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line-subtle bg-surface-2 px-3 py-2",
        className,
      )}
    >
      <FileIcon className="size-4 shrink-0 text-content-tertiary" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-md text-content-primary">{name}</span>
          {sizeBytes != null ? (
            <span className="shrink-0 font-mono text-2xs tabular-nums text-content-tertiary">
              {formatBytes(sizeBytes)}
            </span>
          ) : null}
        </div>
        {status === "uploading" ? <Progress value={progress ?? 0} className="mt-1.5" /> : null}
        {status === "error" && error ? (
          <div className="mt-1 text-xs text-error-strong">{error}</div>
        ) : null}
      </div>
      <StatusGlyph status={status} />
      {onRemove ? (
        <Button variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={onRemove}>
          <X className="size-4" />
        </Button>
      ) : null}
    </li>
  )
}

export { Dropzone, FileList, FileRow, type DropzoneProps, type FileRowProps, type FileStatus }
