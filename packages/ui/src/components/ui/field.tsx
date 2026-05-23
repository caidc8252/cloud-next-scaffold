import * as React from 'react'
import { cn } from '../../lib/utils'
import { Label } from './label'

export interface FieldProps {
  label?: React.ReactNode
  /** Shown below the control in muted text; hidden when error is present */
  hint?: React.ReactNode
  /** Shown in red with role="alert"; replaces hint when present */
  error?: React.ReactNode
  required?: boolean
  /** Omit for radio/checkbox groups — there is no single target element id */
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

// Form field wrapper that stacks label → control → hint/error.
// error takes precedence over hint; renders red text with role="alert" for a11y.
// Omit htmlFor for radio/checkbox groups that have no single target element.
export const Field: React.FC<FieldProps> = ({ label, hint, error, required, htmlFor, className, children }) => (
  <div className={cn('flex flex-col gap-2', className)}>
    {label && (
      <Label htmlFor={htmlFor} className="text-[13px] font-medium text-content-secondary">
        {label}
        {required && <span className="text-error" aria-hidden> *</span>}
      </Label>
    )}
    {children}
    {error ? (
      <p role="alert" className="text-xs text-error">{error}</p>
    ) : hint ? (
      <p className="text-xs text-content-tertiary">{hint}</p>
    ) : null}
  </div>
)


