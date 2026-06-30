import { describe, expect, it } from 'vitest'
import { resolveDispositions } from '../src/resolve'
import type { ContractTable } from '../src/types'

const table: ContractTable = {
  foundationVersion: 'v0.3.0',
  contractHashes: {},
  byClass: {
    btn: { contract: 'button', primary: 'btn', children: [], named: ['Button'], kind: 'export' },
    select: { contract: 'select', primary: 'select', children: [], named: ['Select', 'SelectTrigger'], kind: 'composition' },
    'kv-grid': { contract: 'kv-grid', primary: 'kv-grid', children: [], named: [], kind: 'html' },
    card: { contract: 'option-card', primary: 'card', children: [], named: ['Card', 'RadioGroupItem'], kind: 'composition' },
    partial: { contract: 'partial', primary: 'partial', children: [], named: ['A', 'B'], kind: 'composition' },
  },
}

describe('resolveDispositions', () => {
  it('computes dispositions against the live export set', () => {
    const exports = new Set(['Button', 'Card', 'RadioGroupItem', 'A'])
    const r = resolveDispositions(table, exports)
    expect(r.foundationVersion).toBe('v0.3.0')
    expect(r.byClass.btn!.disposition).toBe('clean-export')
    expect(r.byClass.card!.disposition).toBe('clean-composition')
    expect(r.byClass.select!.disposition).toBe('unimplemented')
    expect(r.byClass.select!.missing).toEqual(['Select', 'SelectTrigger'])
    expect(r.byClass['kv-grid']!.disposition).toBe('html-decompose')
    expect(r.byClass.partial!.disposition).toBe('partial-drift')
    expect(r.byClass.partial!.missing).toEqual(['B'])
  })
})
