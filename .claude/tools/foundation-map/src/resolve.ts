import type { ContractTable, ResolvedEntry, ResolvedTable } from './types'
import { disposition } from './cross-check'

// Consume-time cross-check (spec §4a): compute each class's disposition against
// the real @cloud/ui export set. Never baked into the checked-in table — exports
// lag the contracts and are environment-specific.
export function resolveDispositions(table: ContractTable, exports: Set<string>): ResolvedTable {
  const byClass: Record<string, ResolvedEntry> = {}
  for (const [cls, e] of Object.entries(table.byClass)) {
    const d = disposition(e, exports)
    byClass[cls] = { ...e, disposition: d.disposition, missing: d.missing }
  }
  return { foundationVersion: table.foundationVersion, byClass }
}
