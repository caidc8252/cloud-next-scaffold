#!/usr/bin/env node
// 覆盖清单工具(C1 覆盖闸门的机械核心)。真相 <dir>/coverage.json;coverage.md 由本工具渲染,勿手改。
// 与 ledger.mjs 分离:ledger 装「部分真源」的缺口/决策;本工具装「可再生的义务→落点」核对。
import fs from 'node:fs'
import path from 'node:path'

const KINDS = ['R', 'P', 'SM', 'view', 'behavior', 'entity']
const STATES = ['pending', 'implemented', 'gap', 'out-of-scope']
const SOURCES = ['spec', 'prototype', 'data-model', 'logic']

export function blankDb(category, name) {
  return { module: { category, name }, meta: { task: '', updated: '' }, obligations: [] }
}
function now() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
function dataPath(d) { return path.join(d, 'coverage.json') }
export function load(d) {
  const f = dataPath(d)
  if (!fs.existsSync(f)) throw new Error(`not initialized: ${f} (run 'init' first)`)
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}
export function save(d, db) {
  fs.mkdirSync(d, { recursive: true })
  db.meta.updated = now()
  fs.writeFileSync(dataPath(d), JSON.stringify(db, null, 2) + '\n')
  fs.writeFileSync(path.join(d, 'coverage.md'), render(db))
}

export function ingest(db, obligations) {
  for (const o of obligations) {
    if (!KINDS.includes(o.kind)) throw new Error(`ingest: bad kind '${o.kind}'`)
    if (!o.anchor) throw new Error('ingest: obligation.anchor required')
    if (!SOURCES.includes(o.source)) throw new Error(`ingest: bad/missing source '${o.source}' (one of: ${SOURCES.join(', ')})`)
    const key = `${o.kind}:${o.anchor}`
    const existing = db.obligations.find((x) => x.key === key)
    if (existing) {
      existing.desc = o.desc ?? existing.desc
      existing.source = o.source
      // disposition 保留不动:落点只经 cover 改,ingest 不碰
    } else {
      db.obligations.push({ key, kind: o.kind, anchor: o.anchor, source: o.source, desc: o.desc || '', disposition: { state: 'pending' } })
    }
  }
  return db
}

export function cover(db, key, disposition) {
  if (!STATES.includes(disposition.state)) throw new Error(`cover: bad state '${disposition.state}'`)
  const o = db.obligations.find((x) => x.key === key)
  if (!o) throw new Error(`cover: no obligation '${key}'`)
  o.disposition = disposition
  return db
}

export function gate(db) {
  const pending = db.obligations.filter((o) => (o.disposition?.state ?? 'pending') === 'pending')
  return { ok: pending.length === 0, pending }
}

// ---------- renderer ----------
export function render(db) {
  const L = [`# Coverage: ${db.module.category}/${db.module.name}`,
    `> 由 coverage.mjs 渲染(勿手改) | task: ${db.meta.task || '-'} | 更新: ${db.meta.updated || '-'}`, '']
  L.push('| key | kind | 锚点 | 来源 | 落点 |', '|---|---|---|---|---|')
  for (const o of db.obligations) {
    const d = o.disposition || { state: 'pending' }
    const at = d.state === 'implemented' ? d.at : d.state === 'gap' ? d.gapId : d.state === 'out-of-scope' ? d.reason : ''
    L.push(`| ${o.key} | ${o.kind} | ${o.anchor} | ${o.source} | ${d.state}${at ? ' · ' + at : ''} |`)
  }
  if (db.obligations.length === 0) L.push('| — | — | — | — | 无义务 |')
  return L.join('\n') + '\n'
}
export { KINDS, STATES, SOURCES }

// ---------- CLI ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, dir] = [process.argv[2], process.argv[3]]
  const die = (m) => { console.error('coverage: ' + m); process.exit(1) }
  if (cmd === 'init') {
    const [cat, name] = [process.argv[4], process.argv[5]]
    if (!dir || !cat || !name) die('usage: init <dir> <category> <name>')
    if (fs.existsSync(dataPath(dir))) { console.log('already initialized'); process.exit(0) }
    save(dir, blankDb(cat, name)); console.log('initialized ' + dataPath(dir))
  } else if (cmd === 'ingest') {
    if (!dir) die('usage: ingest <dir>  (stdin: JSON array of obligations)')
    try {
      const db = load(dir)
      const arr = JSON.parse(fs.readFileSync(0, 'utf8') || '[]')
      save(dir, ingest(db, arr))
      console.log(`ingested ${arr.length}, total ${db.obligations.length}`)
    } catch (e) { die(e.message) }
  } else if (cmd === 'cover') {
    const [key, state, extra] = [process.argv[4], process.argv[5], process.argv[6]]
    if (!dir || !key || !state) die('usage: cover <dir> <key> <implemented|gap|out-of-scope> [at|gapId|reason]')
    if (!['implemented', 'gap', 'out-of-scope'].includes(state)) die(`cover: state must be implemented|gap|out-of-scope (got '${state}'); 'pending' 是初始态,不能用 cover 回退（否则会静默重开已绿的 gate）`)
    const disp = { state }
    if (state === 'implemented') disp.at = extra
    else if (state === 'gap') disp.gapId = extra
    else if (state === 'out-of-scope') disp.reason = extra
    try { const db = load(dir); save(dir, cover(db, key, disp)); console.log(`${key} -> ${state}`) } catch (e) { die(e.message) }
  } else if (cmd === 'gate') {
    if (!dir) die('usage: gate <dir>')
    try {
      const { ok, pending } = gate(load(dir))
      if (ok) { console.log('COVERAGE OK'); process.exit(0) }
      console.error('COVERAGE FAIL — 未落点义务:\n - ' + pending.map((o) => o.key).join('\n - '))
      process.exit(1)
    } catch (e) { die(e.message) }
  } else if (cmd === 'list') {
    if (!dir) die('usage: list <dir> [state]')
    try {
      const st = process.argv[4]; const db = load(dir)
      const rows = db.obligations.filter((o) => !st || (o.disposition?.state ?? 'pending') === st)
      for (const o of rows) console.log(`${o.key}\t${o.disposition?.state ?? 'pending'}\t${o.desc.slice(0, 50)}`)
      console.log(`-- ${rows.length} obligation(s)${st ? ' [' + st + ']' : ''}`)
    } catch (e) { die(e.message) }
  } else if (cmd === 'render') {
    if (!dir) die('usage: render <dir>')
    try {
      const db = load(dir)
      fs.writeFileSync(path.join(dir, 'coverage.md'), render(db))
      console.log('rendered')
    } catch (e) { die(e.message) }
  } else { die('unknown or unimplemented command: ' + cmd) }
}
