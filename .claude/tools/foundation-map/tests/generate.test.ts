import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { generateTable } from '../src/generate'

const CONTRACTS = join(__dirname, 'fixtures', 'contracts')

describe('generateTable', () => {
  it('builds a checked-in ContractTable with a populated hash manifest and no disposition', () => {
    const t = generateTable([CONTRACTS], 'v0.3.0')
    expect(t.foundationVersion).toBe('v0.3.0')
    expect(Object.keys(t.contractHashes).length).toBeGreaterThan(0)
    expect(t.contractHashes['contracts/button.md']).toMatch(/^[0-9a-f]{64}$/)
    // button.md's subject class is .btn -> Button export.
    expect(t.byClass.btn!.named).toContain('Button')
    expect(t.byClass.btn!.kind).toBe('export')
    // ContractTable carries NO disposition field (that is consume-time).
    expect('disposition' in (t.byClass.btn as object)).toBe(false)
  })
})
