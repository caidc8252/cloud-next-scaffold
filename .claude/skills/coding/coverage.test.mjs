// node:test suite for coverage.mjs — all tasks 1–5
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { blankDb, ingest, cover, gate, render } from './coverage.mjs'

// Task 1
test('blankDb: 空库结构正确', () => {
  const db = blankDb('APPS', 'STORE')
  assert.equal(db.module.category, 'APPS')
  assert.equal(db.module.name, 'STORE')
  assert.deepEqual(db.obligations, [])
})

// Task 2
test('ingest: 幂等 + 保留 disposition + 追加新项', () => {
  let db = blankDb('APPS', 'STORE')
  db = ingest(db, [{ kind: 'R', anchor: 'app-store.md#R-7', source: 'spec', desc: '导入/退订权限' }])
  assert.equal(db.obligations.length, 1)
  assert.equal(db.obligations[0].key, 'R:app-store.md#R-7')
  assert.equal(db.obligations[0].disposition.state, 'pending')

  // 先给它一个落点,再 ingest 同 key(desc 变) → 不新增、保留落点、更新 desc
  db.obligations[0].disposition = { state: 'implemented', at: 'service.ts:doImport' }
  db = ingest(db, [{ kind: 'R', anchor: 'app-store.md#R-7', source: 'spec', desc: '导入/退订权限(改)' }])
  assert.equal(db.obligations.length, 1)
  assert.equal(db.obligations[0].disposition.state, 'implemented')
  assert.equal(db.obligations[0].desc, '导入/退订权限(改)')

  // 新 key 追加
  db = ingest(db, [{ kind: 'view', anchor: 'STORE.html#view-detail', source: 'prototype', desc: '详情页' }])
  assert.equal(db.obligations.length, 2)
})

// Task 3
test('cover: 设落点 + 未知 key 抛错 + 非法 state 抛错', () => {
  let db = ingest(blankDb('APPS', 'STORE'), [{ kind: 'SM', anchor: 'app-store.md#SM-1/t3', source: 'spec', desc: '失效→有效' }])
  const key = 'SM:app-store.md#SM-1/t3'
  db = cover(db, key, { state: 'implemented', at: 'service.ts:reSub' })
  assert.equal(db.obligations[0].disposition.at, 'service.ts:reSub')
  db = cover(db, key, { state: 'gap', gapId: 'L-4' })
  assert.equal(db.obligations[0].disposition.gapId, 'L-4')
  assert.throws(() => cover(db, 'R:nope', { state: 'implemented' }), /no obligation/)
  assert.throws(() => cover(db, key, { state: 'bogus' }), /bad state/)
})

// Task 4
test('gate: 有 pending 则 !ok,全有落点则 ok', () => {
  let db = ingest(blankDb('APPS', 'STORE'), [
    { kind: 'R', anchor: 'a#R-1', source: 'spec', desc: 'x' },
    { kind: 'R', anchor: 'a#R-2', source: 'spec', desc: 'y' },
  ])
  let g = gate(db)
  assert.equal(g.ok, false)
  assert.equal(g.pending.length, 2)
  db = cover(db, 'R:a#R-1', { state: 'implemented', at: 's.ts:f' })
  db = cover(db, 'R:a#R-2', { state: 'out-of-scope', reason: '本期不做' })
  g = gate(db)
  assert.equal(g.ok, true)
  assert.equal(g.pending.length, 0)
})

// Task 5
test('render: 含义务行 + 落点', () => {
  let db = ingest(blankDb('APPS', 'STORE'), [{ kind: 'view', anchor: 'STORE.html#view-detail', source: 'prototype', desc: '详情页' }])
  db = cover(db, 'view:STORE.html#view-detail', { state: 'implemented', at: 'ui/detail.tsx' })
  const md = render(db)
  assert.match(md, /# Coverage: APPS\/STORE/)
  assert.match(md, /view:STORE\.html#view-detail/)
  assert.match(md, /implemented · ui\/detail\.tsx/)
})

test('render: pending 行不带噪声后缀', () => {
  const db = ingest(blankDb('APPS', 'STORE'), [{ kind: 'R', anchor: 'a#R-9', source: 'spec', desc: 'x' }])
  const md = render(db)
  assert.match(md, /pending/)
  assert.doesNotMatch(md, /pending · —/)
})

// M3 review D2: source 是必填枚举,缺失/非法当场抛错(避免静默默认成 spec)
test('ingest: 缺失/非法 source 抛错', () => {
  assert.throws(() => ingest(blankDb('APPS', 'STORE'), [{ kind: 'R', anchor: 'a#R-1', desc: 'no source' }]), /bad\/missing source/)
  assert.throws(() => ingest(blankDb('APPS', 'STORE'), [{ kind: 'R', anchor: 'a#R-2', source: 'bogus', desc: 'x' }]), /bad\/missing source/)
})
