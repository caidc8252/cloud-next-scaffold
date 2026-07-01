import { collectInstances, runGate } from '../src/gate'
import { emitTsx } from '../src/emit-tsx'
import type { IRNode } from '../src/types'

const node = (over: Partial<IRNode>): IRNode => ({
  id: 0, line: 1, tag: 'div', classes: [], bases: [], bucket: 'clean-mapped', matchedClass: null, component: 'Card', ...over,
})

test('collectInstances reads data-src ordinals and component names', () => {
  const tsx = emitTsx([node({ id: 0, component: 'Card' }), node({ id: 3, component: 'Button' })])
  const inst = collectInstances(tsx)
  expect(inst.get(0)).toBe('Card')
  expect(inst.get(3)).toBe('Button')
})

test('round-trip is reliable when emitter output matches the IR', () => {
  const nodes = [node({ id: 0, component: 'Card' }), node({ id: 1, component: 'Button' }), node({ id: 2, bucket: 'unimplemented', component: null, matchedClass: 'dropzone' })]
  const res = runGate(nodes, emitTsx(nodes))
  expect(res.roundTrip.onContractNodes).toBe(2)
  expect(res.roundTrip.matchedInstances).toBe(2)
  expect(res.roundTrip.unmatchedNodes).toBe(0)
  expect(res.roundTrip.orphanInstances).toBe(0)
  expect(res.roundTrip.reliable).toBe(true)
})

test('html-decompose nodes round-trip as raw HTML tags, not unmatched', () => {
  const nodes = [
    node({ id: 0, component: 'Card' }),
    node({ id: 1, bucket: 'html-decompose', component: null, tag: 'dl', matchedClass: 'kv-grid' }),
  ]
  const res = runGate(nodes, emitTsx(nodes))
  expect(res.roundTrip.onContractNodes).toBe(2)
  expect(res.roundTrip.matchedInstances).toBe(2)
  expect(res.roundTrip.unmatchedNodes).toBe(0)
  expect(res.roundTrip.reliable).toBe(true)
})

test('detects an orphan instance (TSX ahead of IR)', () => {
  const nodes = [node({ id: 0, component: 'Card' })]
  const tampered = emitTsx(nodes).replace('</>', '  <Button data-src={99} />\n    </>')
  const res = runGate(nodes, tampered)
  expect(res.roundTrip.orphanInstances).toBe(1)
  expect(res.roundTrip.reliable).toBe(false)
})

test('detects an unmatched node (IR ahead of TSX)', () => {
  const nodes = [node({ id: 0, component: 'Card' }), node({ id: 1, component: 'Button' })]
  const tsxMissingOne = emitTsx([nodes[0]!])
  const res = runGate(nodes, tsxMissingOne)
  expect(res.roundTrip.unmatchedNodes).toBe(1)
  expect(res.roundTrip.reliable).toBe(false)
})

test('flags a component-name mismatch as unmatched, not matched', () => {
  const nodes = [node({ id: 0, component: 'Card' })]
  const wrong = emitTsx([node({ id: 0, component: 'Button' })]) // same id, wrong component
  const res = runGate(nodes, wrong)
  expect(res.roundTrip.matchedInstances).toBe(0)
  expect(res.roundTrip.unmatchedNodes).toBe(1)
})
