import { describe, expect, it } from 'vitest'
import { driftCheck } from '../src/drift'
import type { ContractTable } from '../src/types'

const base: ContractTable = {
  foundationVersion: 'v0.3.0',
  contractHashes: { 'primitives/button.md': 'aaa', 'primitives/alert.md': 'bbb' },
  byClass: {},
}

describe('driftCheck', () => {
  it('reports no drift when hashes match', () => {
    const r = driftCheck(base, { 'primitives/button.md': 'aaa', 'primitives/alert.md': 'bbb' })
    expect(r.drifted).toBe(false)
    expect(r.changed).toEqual([]); expect(r.added).toEqual([]); expect(r.removed).toEqual([])
  })
  it('detects changed, added, and removed contracts', () => {
    const r = driftCheck(base, { 'primitives/button.md': 'ZZZ', 'primitives/badge.md': 'ccc' })
    expect(r.drifted).toBe(true)
    expect(r.changed).toEqual(['primitives/button.md'])
    expect(r.added).toEqual(['primitives/badge.md'])
    expect(r.removed).toEqual(['primitives/alert.md'])
  })
})
