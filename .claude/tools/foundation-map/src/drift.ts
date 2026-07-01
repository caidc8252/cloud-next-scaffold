import type { ContractTable } from './types'

export interface DriftResult {
  drifted: boolean
  changed: string[]   // present in both, hash differs
  added: string[]     // present now, absent in table
  removed: string[]   // present in table, absent now
}

export function driftCheck(table: ContractTable, current: Record<string, string>): DriftResult {
  const was = table.contractHashes
  const changed: string[] = []
  const removed: string[] = []
  for (const [path, h] of Object.entries(was)) {
    if (!(path in current)) removed.push(path)
    else if (current[path] !== h) changed.push(path)
  }
  const added = Object.keys(current).filter((p) => !(p in was))
  changed.sort(); added.sort(); removed.sort()
  return { drifted: changed.length + added.length + removed.length > 0, changed, added, removed }
}
