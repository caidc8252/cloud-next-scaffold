import { parse } from '@babel/parser'
import { emitTsx } from '../src/emit-tsx'
import type { IRNode } from '../src/types'

const node = (over: Partial<IRNode>): IRNode => ({
  id: 0, line: 1, tag: 'div', classes: [], bases: [], bucket: 'clean-mapped', matchedClass: null, component: 'Card', ...over,
})

test('emits one JSX instance per clean-mapped node carrying data-src', () => {
  const tsx = emitTsx([node({ id: 0, component: 'Card' }), node({ id: 1, component: 'Button' })])
  expect(tsx).toMatch(/<Card\s+data-src=\{0\}/)
  expect(tsx).toMatch(/<Button\s+data-src=\{1\}/)
})

test('emits unimplemented/residue nodes as comments, not instances', () => {
  const tsx = emitTsx([node({ id: 5, bucket: 'unimplemented', component: null, matchedClass: 'dropzone' })])
  expect(tsx).not.toMatch(/<\w+\s+data-src=\{5\}/)
  expect(tsx).toMatch(/data-src=\{5\}.*unimplemented/)
})

test('output parses as valid TSX', () => {
  const tsx = emitTsx([node({ id: 0, component: 'Card' })])
  expect(() => parse(tsx, { sourceType: 'module', plugins: ['jsx', 'typescript'] })).not.toThrow()
})
