import { parse } from '@babel/parser'
import * as t from '@babel/types'
import type { GateResult, IRNode, NodeBucket } from './types'

export function collectInstances(tsx: string): Map<number, string> {
  const ast = parse(tsx, { sourceType: 'module', plugins: ['jsx', 'typescript'] })
  const out = new Map<number, string>()
  const visit = (node: t.Node): void => {
    if (t.isJSXElement(node)) {
      const open = node.openingElement
      if (t.isJSXIdentifier(open.name)) {
        for (const attr of open.attributes) {
          if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name) || attr.name.name !== 'data-src') continue
          const v = attr.value
          if (v && t.isJSXExpressionContainer(v) && t.isNumericLiteral(v.expression)) {
            out.set(v.expression.value, open.name.name)
          }
        }
      }
    }
    for (const key of Object.keys(node)) {
      const child = (node as unknown as Record<string, unknown>)[key]
      if (Array.isArray(child)) child.forEach((c) => t.isNode(c) && visit(c))
      else if (child && typeof child === 'object' && t.isNode(child as t.Node)) visit(child as t.Node)
    }
  }
  visit(ast.program)
  return out
}

export function runGate(nodes: IRNode[], tsx: string): GateResult {
  const buckets: Record<NodeBucket, number> = {
    'clean-mapped': 0, 'html-decompose': 0, unimplemented: 0, 'layout-residue': 0, 'offcontract-unknown': 0, absorbed: 0,
  }
  for (const n of nodes) buckets[n.bucket]++

  const instances = collectInstances(tsx)
  // Emittable nodes = named-component instances (clean-mapped) AND raw-HTML maps (html-decompose).
  // Absorbed members carry no element of their own (folded into a composition root), so they
  // are neither emittable nor gated. A clean-mapped node matches ANY of its contract's `named`
  // components — a composition root may idiomatically render RadioGroupItem/FileList/… rather
  // than the primary named[0]. An html-decompose node matches its source tag.
  const emittable = nodes.filter((n) => n.bucket === 'clean-mapped' || n.bucket === 'html-decompose')
  const emittableIds = new Set(emittable.map((n) => n.id))

  let matched = 0
  let unmatched = 0
  for (const n of emittable) {
    const found = instances.get(n.id)
    const accepted = n.bucket === 'clean-mapped'
      ? new Set([...n.named, ...(n.component ? [n.component] : [])])
      : new Set([n.tag])
    if (found !== undefined && accepted.has(found)) matched++
    else unmatched++
  }
  let orphan = 0
  for (const id of instances.keys()) if (!emittableIds.has(id)) orphan++

  return {
    total: nodes.length,
    buckets,
    roundTrip: {
      onContractNodes: emittable.length,
      matchedInstances: matched,
      orphanInstances: orphan,
      unmatchedNodes: unmatched,
      reliable: orphan === 0 && unmatched === 0,
    },
  }
}
