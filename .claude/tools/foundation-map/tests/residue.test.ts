import { describe, expect, it } from 'vitest'
import { buildResidueReport } from '../src/residue'
import type { IRNode } from '../src/types'

const node = (id: number, bucket: IRNode['bucket'], extra: Partial<IRNode> = {}): IRNode => ({
  id, line: id, tag: 'div', classes: ['x'], bases: ['x'], bucket, matchedClass: null, component: null, named: [], absorbedBy: null, ...extra,
})

describe('buildResidueReport', () => {
  it('splits the three human/silent buckets and counts every bucket', () => {
    const nodes: IRNode[] = [
      node(0, 'clean-mapped', { component: 'Button' }),
      node(1, 'html-decompose'),
      node(2, 'layout-residue', { classes: ['wizard-step'], bases: ['wizard'] }),
      node(3, 'unimplemented', { matchedClass: 'select' }),
      node(4, 'offcontract-unknown', { classes: ['mystery'], bases: ['mystery'] }),
    ]
    const r = buildResidueReport(nodes, 'v0.3.0')
    expect(r.version).toBe('v0.3.0')
    expect(r.counts['clean-mapped']).toBe(1)
    expect(r.counts['html-decompose']).toBe(1)
    expect(r.layoutResidue.map((i) => i.id)).toEqual([2])
    expect(r.unimplemented.map((i) => i.id)).toEqual([3])
    expect(r.offContractUnknown.map((i) => i.id)).toEqual([4])
  })
})
