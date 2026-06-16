"use client"

import { useCallback, useMemo, useState } from "react"

export type UseListFiltersOptions<T> = {
  // The initial value IS the "unfiltered" baseline: apply / clear reset to it, and
  // countActive / hasApplied compare each field against it.
  initial: T
  // Called after apply / clearField / clearAll commit — the page resets pagination here.
  onApply?: () => void
}

export type ListFilters<T> = {
  draft: T
  applied: T
  setDraft: <K extends keyof T>(key: K, value: T[K]) => void
  // Commit: draft → applied, fires onApply.
  apply: () => void
  // Remove one applied condition: draft + applied both reset to the initial value, fires onApply (chip ×).
  clearField: (key: keyof T) => void
  // Clear everything: draft + applied both reset to initial, fires onApply.
  clearAll: () => void
  // Reset the draft only (does NOT commit / touch applied): no keys = reset all; keys = reset a subset (Advanced's Reset).
  reset: (keys?: readonly (keyof T)[]) => void
  // Count keys whose value differs from initial; source defaults to "applied" (badge), pass "draft" for Reset-disabled.
  countActive: (keys: readonly (keyof T)[], source?: "applied" | "draft") => number
  // Whether any condition is currently applied (count band "matching filters", chip-row visibility).
  hasApplied: boolean
}

// Draft / applied state machine for list filters (portal-page-style-spec §4 / §4.1).
// "Active" is decided by per-field `!== initial`, so it fits string / number / boolean
// fields; array / object fields need their own counting in the caller. Pairs with the
// family: quick bar edits the draft live, Search / Apply & Search commit, closing the
// sheet keeps the draft.
export function useListFilters<T extends Record<string, unknown>>(
  options: UseListFiltersOptions<T>,
): ListFilters<T> {
  const { onApply } = options
  // Freeze the first initial so the callbacks below don't rebuild when a caller passes an inline object.
  // Lazy useState (not a ref) so we never read a ref during render — the value is captured once and never updates.
  const [initial] = useState(options.initial)

  const [draft, setDraftState] = useState<T>(initial)
  const [applied, setApplied] = useState<T>(initial)

  const setDraft = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraftState((d) => ({ ...d, [key]: value }))
  }, [])

  const apply = useCallback(() => {
    setApplied(draft)
    onApply?.()
  }, [draft, onApply])

  const clearField = useCallback(
    (key: keyof T) => {
      setDraftState((d) => ({ ...d, [key]: initial[key] }))
      setApplied((a) => ({ ...a, [key]: initial[key] }))
      onApply?.()
    },
    [initial, onApply],
  )

  const clearAll = useCallback(() => {
    setDraftState(initial)
    setApplied(initial)
    onApply?.()
  }, [initial, onApply])

  const reset = useCallback(
    (keys?: readonly (keyof T)[]) => {
      setDraftState((d) => {
        if (!keys) return initial
        const next = { ...d }
        for (const key of keys) next[key] = initial[key]
        return next
      })
    },
    [initial],
  )

  const countActive = useCallback(
    (keys: readonly (keyof T)[], source: "applied" | "draft" = "applied") => {
      const values = source === "draft" ? draft : applied
      return keys.reduce((count, key) => count + (values[key] !== initial[key] ? 1 : 0), 0)
    },
    [applied, draft, initial],
  )

  const hasApplied = useMemo(
    () => (Object.keys(initial) as (keyof T)[]).some((key) => applied[key] !== initial[key]),
    [applied, initial],
  )

  return { draft, applied, setDraft, apply, clearField, clearAll, reset, countActive, hasApplied }
}
