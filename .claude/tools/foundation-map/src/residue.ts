import type { IRNode, NodeBucket } from './types'

export interface ResidueItem {
  id: number
  line: number
  tag: string
  classes: string[]
  matchedClass: string | null
}

export interface ResidueReport {
  version: string
  counts: Record<NodeBucket, number>
  layoutResidue: ResidueItem[]       // (a) off-contract layout -> silent Tailwind (no human gate; still listed)
  unimplemented: ResidueItem[]       // (c) contracted-but-unimplemented -> human flag
  offContractUnknown: ResidueItem[]  // (b) off-contract unknown / missing-primitive -> human flag
}

const item = (n: IRNode): ResidueItem => ({
  id: n.id, line: n.line, tag: n.tag, classes: n.classes, matchedClass: n.matchedClass,
})

export function buildResidueReport(nodes: IRNode[], version: string): ResidueReport {
  const counts: Record<NodeBucket, number> = {
    'clean-mapped': 0, 'html-decompose': 0, unimplemented: 0, 'layout-residue': 0, 'offcontract-unknown': 0,
  }
  for (const n of nodes) counts[n.bucket]++
  return {
    version,
    counts,
    layoutResidue: nodes.filter((n) => n.bucket === 'layout-residue').map(item),
    unimplemented: nodes.filter((n) => n.bucket === 'unimplemented').map(item),
    offContractUnknown: nodes.filter((n) => n.bucket === 'offcontract-unknown').map(item),
  }
}
