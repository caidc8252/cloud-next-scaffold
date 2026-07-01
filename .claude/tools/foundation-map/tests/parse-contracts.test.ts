import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseContract, assignOwnership } from '../src/parse-contracts'

const F = join(__dirname, 'fixtures/contracts')
const read = (n: string) => readFileSync(join(F, `${n}.md`), 'utf8')

test('parseContract extracts owned primary class and named imports', () => {
  const e = parseContract(read('button'), 'button')!
  expect(e.primary).toBe('btn')
  expect(e.named).toEqual(['Button'])
  expect(e.kind).toBe('export')
})

test('parseContract treats a multi-import "a Card wrapping X" as composition', () => {
  const e = parseContract(read('option-card'), 'option-card')!
  expect(e.primary).toBe('option-card')
  expect(e.named).toEqual(['Card', 'RadioGroupItem'])
  expect(e.kind).toBe('composition')
})

test('parseContract flags raw-HTML decompose when no Capitalized import is named', () => {
  const e = parseContract(read('kv-grid'), 'kv-grid')!
  expect(e.named).toEqual([])
  expect(e.kind).toBe('html')
})

test('assignOwnership keeps .btn with button.md, NOT alert.md (collision fix)', () => {
  const entries = [parseContract(read('alert'), 'alert')!, parseContract(read('button'), 'button')!]
  const owned = assignOwnership(entries)
  expect(owned.get('btn')!.contract).toBe('button')
  expect(owned.get('alert')!.contract).toBe('alert')
})
