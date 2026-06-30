import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ContractTableSchema } from '../src/types'

const table = ContractTableSchema.parse(
  JSON.parse(readFileSync(join(__dirname, '..', 'tables', 'foundation-v0.3.0.json'), 'utf8')),
)

describe('checked-in foundation-v0.3.0 table', () => {
  it('is version-pinned with a populated hash manifest', () => {
    expect(table.foundationVersion).toBe('v0.3.0')
    expect(Object.keys(table.contractHashes).length).toBeGreaterThan(50)
  })
  it('covers the app-publish vocabulary subjects', () => {
    // Subject classes the app-publish fixture exercises (spike §; spec §4e/§8).
    for (const cls of ['btn', 'field', 'input', 'badge', 'alert', 'step', 'card', 'kv-grid']) {
      expect(table.byClass[cls], `missing class ${cls}`).toBeDefined()
    }
  })
  it('records the contracted-but-unimplemented and html-decompose contracts by kind', () => {
    expect(table.byClass['kv-grid']!.kind).toBe('html')          // -> <dl> decompose
    expect(table.byClass.select!.named.length).toBeGreaterThan(1) // Select cluster (composition)
  })
})
