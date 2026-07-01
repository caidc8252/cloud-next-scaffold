import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ContractTableSchema, type ContractTable } from './types'

// Version-match precondition (spec §6): refuse unless a table built from the
// artifact's exact declared foundation version is checked in.
export function loadTable(version: string, tablesDir: string): ContractTable {
  const path = join(tablesDir, `foundation-${version}.json`)
  if (!existsSync(path)) {
    throw new Error(
      `no checked-in table for foundation ${version} — refusing to transform ` +
      `(run: foundation-map generate ${version} against a matching foundation checkout)`,
    )
  }
  const table = ContractTableSchema.parse(JSON.parse(readFileSync(path, 'utf8')))
  if (table.foundationVersion !== version) {
    throw new Error(
      `checked-in table foundation-${version}.json declares version ${table.foundationVersion} — refusing (regenerate the table)`,
    )
  }
  return table
}
