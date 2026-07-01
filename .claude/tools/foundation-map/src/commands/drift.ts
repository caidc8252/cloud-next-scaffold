import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_TABLES_DIR } from '../paths'
import { ContractTableSchema } from '../types'
import { hashContracts } from '../hash'
import { driftCheck } from '../drift'

const FOUNDATION = process.env.FOUNDATION_DIR ?? '/workspaces/foundation'

export function driftCmd(
  version: string,
  opts: { foundationDir?: string; tablesDir?: string } = {},
): number {
  if (!version) { console.error('usage: foundation-map drift-check <version>'); return 2 }
  const foundationDir = opts.foundationDir ?? FOUNDATION
  const tablesDir = opts.tablesDir ?? DEFAULT_TABLES_DIR
  const tablePath = join(tablesDir, `foundation-${version}.json`)
  const table = ContractTableSchema.parse(JSON.parse(readFileSync(tablePath, 'utf8')))
  const current = hashContracts([join(foundationDir, 'primitives'), join(foundationDir, 'composites')])
  const r = driftCheck(table, current)
  if (!r.drifted) { console.log(`drift-check ${version}: clean`); return 0 }
  console.error(`drift-check ${version}: DRIFTED — regenerate the table (foundation-map generate ${version})`)
  for (const p of r.changed) console.error(`  changed: ${p}`)
  for (const p of r.added) console.error(`  added:   ${p}`)
  for (const p of r.removed) console.error(`  removed: ${p}`)
  return 1
}
