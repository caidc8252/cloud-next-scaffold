import { ResolvedEntrySchema, ResolvedTableSchema } from '../src/types'

test('ResolvedEntry schema accepts a clean-export entry', () => {
  const e = { contract: 'button', primary: 'btn', children: [], named: ['Button'], kind: 'export', disposition: 'clean-export', missing: [] }
  expect(ResolvedEntrySchema.parse(e)).toEqual(e)
})

test('ResolvedTable schema requires a foundationVersion', () => {
  expect(() => ResolvedTableSchema.parse({ byClass: {} })).toThrow()
})
