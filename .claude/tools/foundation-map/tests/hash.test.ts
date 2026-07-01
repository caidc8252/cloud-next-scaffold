import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { hashContracts } from '../src/hash'

const CONTRACTS = join(__dirname, 'fixtures', 'contracts')

describe('hashContracts', () => {
  it('hashes every contract file by relative path and is stable', () => {
    const a = hashContracts([CONTRACTS])
    const b = hashContracts([CONTRACTS])
    expect(a).toEqual(b) // deterministic
    expect(Object.keys(a)).toContain('contracts/button.md')
    expect(a['contracts/button.md']).toMatch(/^[0-9a-f]{64}$/)
  })
})
