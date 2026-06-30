import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { ContractEntry, ContractTable } from './types'
import { parseContract, assignOwnership } from './parse-contracts'

// Build the checked-in contract table from foundation contracts. NO exports,
// NO disposition — those are consume-time. `contractHashes` is supplied by the
// generator (Task 2); empty by default for unit tests.
export function buildContractTable(
  contractsDirs: string[],
  foundationVersion: string,
  contractHashes: Record<string, string> = {},
): ContractTable {
  const entries: ContractEntry[] = []
  for (const dir of contractsDirs) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      const e = parseContract(readFileSync(join(dir, f), 'utf8'), basename(f, '.md'))
      if (e) entries.push(e)
    }
  }
  const owned = assignOwnership(entries)
  const byClass: Record<string, ContractEntry> = {}
  for (const [cls, e] of owned) byClass[cls] = e
  return { foundationVersion, contractHashes, byClass }
}
