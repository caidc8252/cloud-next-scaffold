import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_TABLES_DIR } from '../paths'
import { generateTable } from '../generate'

const FOUNDATION = process.env.FOUNDATION_DIR ?? '/workspaces/foundation'

// Maintenance command. Reads foundation contracts and writes the checked-in,
// version-pinned table. Never run at consume time.
export function generateCmd(
  version: string,
  opts: { foundationDir?: string; tablesDir?: string } = {},
): number {
  if (!version) { console.error('usage: foundation-map generate <version>'); return 2 }
  const foundationDir = opts.foundationDir ?? FOUNDATION
  const tablesDir = opts.tablesDir ?? DEFAULT_TABLES_DIR
  const table = generateTable(
    [join(foundationDir, 'primitives'), join(foundationDir, 'composites')],
    version,
  )
  mkdirSync(tablesDir, { recursive: true })
  const out = join(tablesDir, `foundation-${version}.json`)
  writeFileSync(out, JSON.stringify(table, null, 2) + '\n')
  console.log(`wrote ${out}  (${Object.keys(table.byClass).length} classes, ${Object.keys(table.contractHashes).length} contracts hashed)`)
  return 0
}
