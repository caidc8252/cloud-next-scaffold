#!/usr/bin/env node
// logic-analyze 的「确定性台账助手」(路线乙)。
// 真相在 <dir>/logic.items.json;logic.md 由本助手渲染产出,任何人都不手改。
// 判断(分析缺口、提炼逻辑、跟操作员澄清)留在 SKILL 散文里;本助手只负责机械记账:
//   发号、翻状态、保留未消费条目(永不删)、取代/作废、渲染、finalize 检查。
// 纯 Node ESM,无第三方依赖,无需构建:  node ledger.mjs <cmd> <dir> [...]
import fs from 'node:fs'
import path from 'node:path'

const STATUSES = ['待实现', '已处理', 'blocked', '需返工', '作废']
const TYPES = ['接口落点', '持久化', '外部/异步', '跨制品冲突', '跨模块依赖', '变更点(vs代码)', '其它技术']

const dir = process.argv[3]
const cmd = process.argv[2]
if (!cmd) die('usage: node ledger.mjs <init|meta|digest|add|status|list|render|finalize> <dir> [...]')

function die(msg, code = 1) { console.error('ledger: ' + msg); process.exit(code) }
function now() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
function readStdin() {
  try { return fs.readFileSync(0, 'utf8') } catch { return '' }
}
function dataPath(d) { return path.join(d, 'logic.items.json') }
function load(d) {
  const f = dataPath(d)
  if (!fs.existsSync(f)) die(`not initialized: ${f} (run 'init' first)`)
  return JSON.parse(fs.readFileSync(f, 'utf8'))
}
function save(d, db) {
  fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(dataPath(d), JSON.stringify(db, null, 2) + '\n')
  render(d, db) // 每次写入后自动重渲染,保证 logic.md 永远等于真相
}

function blankDb(category, name) {
  return {
    module: { category, name },
    meta: { task: '', updated: '', specs: '', prototype: '', data_model: '', groom: '无', code_exists: false, mode: '首次(无基线,全量)' },
    digest: { mode: '首次', rows: [] },       // §1 瞬态,每轮重算
    items: [],                                 // §2 持久台账
    next_id: 1
  }
}

// ---------- commands ----------
if (cmd === 'init') {
  const category = process.argv[4], name = process.argv[5]
  if (!dir || !category || !name) die('usage: init <dir> <category> <name>')
  if (fs.existsSync(dataPath(dir))) { console.log('already initialized'); process.exit(0) }
  save(dir, blankDb(category, name))
  console.log('initialized ' + dataPath(dir))
} else if (cmd === 'meta') {
  const db = load(dir); Object.assign(db.meta, JSON.parse(readStdin() || '{}')); db.meta.updated = now(); save(dir, db)
  console.log('meta updated')
} else if (cmd === 'digest') {
  const db = load(dir); db.digest = JSON.parse(readStdin() || '{}'); db.meta.updated = now(); save(dir, db)
  console.log('digest updated')
} else if (cmd === 'add') {
  const db = load(dir)
  const it = JSON.parse(readStdin() || '{}')
  if (!it.desc) die('add: item.desc required (stdin JSON)')
  if (it.type && !TYPES.includes(it.type)) die(`add: bad type '${it.type}'. one of: ${TYPES.join(', ')}`)
  const id = db.next_id++
  db.items.push({
    id, type: it.type || '其它技术', status: '待实现',
    deps: it.deps || [], supersedes: it.supersedes ?? null, superseded_by: null,
    source: it.source || 'logic-analyze', anchors: it.anchors || [], judge: it.judge || '', desc: it.desc,
    round: now()
  })
  if (it.supersedes != null) { // 标记被取代的旧条目(可能 coding 已实现 → 需返工)
    const old = db.items.find(x => x.id === it.supersedes)
    if (old) { old.superseded_by = id; old.status = old.status === '已处理' ? '需返工' : '作废' }
  }
  db.meta.updated = now(); save(dir, db)
  console.log('L-' + id)
} else if (cmd === 'status') {
  const id = Number(process.argv[4]), st = process.argv[5], by = process.argv[6]
  if (!st || !STATUSES.includes(st)) die(`status: usage status <dir> <id> <${STATUSES.join('|')}> [bySupersedeId]`)
  const db = load(dir)
  const it = db.items.find(x => x.id === id)
  if (!it) die('status: no L-' + id)
  it.status = st
  if (st === '作废' && by) it.superseded_by = Number(by)
  db.meta.updated = now(); save(dir, db)
  console.log(`L-${id} -> ${st}`)
} else if (cmd === 'list') {
  const db = load(dir); const filter = process.argv[4]
  const rows = db.items.filter(x => !filter || x.status === filter)
  for (const x of rows) console.log(`L-${x.id}\t${x.status}\t${x.type}\t${x.desc.slice(0, 60)}`)
  console.log(`-- ${rows.length} item(s)${filter ? ' [' + filter + ']' : ''}`)
} else if (cmd === 'render') {
  render(dir, load(dir)); console.log('rendered')
} else if (cmd === 'finalize') {
  const db = load(dir)
  const problems = []
  // 完整性:依赖存在、取代链一致、blocked/需返工 提示
  const ids = new Set(db.items.map(x => x.id))
  for (const x of db.items) {
    for (const d of x.deps) if (!ids.has(d)) problems.push(`L-${x.id} 依赖不存在的 L-${d}`)
    if (x.supersedes != null && !ids.has(x.supersedes)) problems.push(`L-${x.id} 取代不存在的 L-${x.supersedes}`)
  }
  // 待实现/需返工 都是交给 coding 的合法交接态,不拦;只拦 blocked(缺契约,没法交接)。
  const blocked = db.items.filter(x => x.status === 'blocked').map(x => 'L-' + x.id)
  if (blocked.length) problems.push('存在 blocked 条目: ' + blocked.join(', '))
  if (problems.length) { console.error('FINALIZE FAIL:\n - ' + problems.join('\n - ')); process.exit(1) }
  console.log('FINALIZE OK')
} else {
  die('unknown command: ' + cmd)
}

// ---------- renderer: logic.items.json -> logic.md ----------
function render(d, db) {
  const m = db.meta, mod = db.module
  const L = []
  L.push(`# Logic: ${mod.category}/${mod.name}`)
  L.push(`> 由 /logic-analyze 生成(经 ledger.mjs 渲染,勿手改) | task: ${m.task || '-'} | 更新时间: ${m.updated || '-'}`)
  L.push(`> 本文件是 /coding 直读的四真源之一（specs + 原型 + data-model + logic.md），与其它三源**并读**，不是唯一交接物。只装「specs(业务)与原型(展现)都没说、但写代码必须知道」的实现逻辑与决策;不复述业务。`)
  L.push(`> 消费:coding 逐条消费 §2 的 L-n,经 ledger.mjs 把「状态」由 待实现 改为 已处理;未消费条目永不被覆盖。`)
  L.push(`> 基线:权威 commit 游标在 .work/workbench.json;本文件 commit 只是给人/coding 看的快照。`)
  L.push('')
  L.push('## 0. 溯源 & 上下文')
  L.push(`- specs:      ${m.specs || '-'}`)
  L.push(`- prototype:  ${m.prototype || '-'}`)
  L.push(`- data-model: ${m.data_model || '-'}`)
  L.push(`- groom:      ${m.groom || '无'}`)
  L.push(`- 既有代码:   apps/web/modules/${mod.category}/${mod.name}/（${m.code_exists ? '已存在' : '全新模块'}）`)
  L.push(`- 分析模式:   ${m.mode || '-'}`)
  L.push('')
  L.push('## 1. 增量差异总结（Diff Digest｜瞬态,每轮按新区间重算）')
  if (!db.digest.rows || db.digest.rows.length === 0) {
    L.push('- 首次分析,无基线,全量读取。')
  } else {
    L.push('| Δ-id | 来源 | commit 区间 | 命中本模块的变更 | 结论 |')
    L.push('|------|------|-------------|------------------|------|')
    db.digest.rows.forEach((r, i) => L.push(`| Δ-${i + 1} | ${r.source || ''} | ${r.range || ''} | ${r.change || ''} | ${r.conclusion || ''} |`))
  }
  L.push('')
  L.push('## 2. 逻辑条目（coding 消费台账｜持久、累积、带状态）')
  L.push('> 状态: 待实现 | 已处理 | blocked | 需返工 | 作废。仅经 ledger.mjs 变更,勿手改。')
  if (db.items.length === 0) L.push('\n- 无')
  else for (const x of db.items) L.push('\n' + renderItem(x))
  fs.writeFileSync(path.join(d, 'logic.md'), L.join('\n') + '\n')
}

function renderItem(x) {
  const tags = [`类型:${x.type}`, `状态:${x.status}`]
  if (x.deps && x.deps.length) tags.push('依赖:' + x.deps.map(i => 'L-' + i).join(','))
  if (x.supersedes != null) tags.push('取代:L-' + x.supersedes)
  if (x.superseded_by != null) tags.push('已被 L-' + x.superseded_by + ' 取代')
  const lines = [`### L-${x.id} 〔${tags.join('〕〔')}〕`]
  lines.push(`- 描述: ${x.desc}`)
  if (x.judge) lines.push(`- 判据: ${x.judge}`)
  if (x.anchors && x.anchors.length) lines.push(`- 锚点: ${x.anchors.join('; ')}`)
  lines.push(`- 来源: ${x.source}`)
  return lines.join('\n')
}
