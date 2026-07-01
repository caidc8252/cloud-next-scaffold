import type { IRNode, ResolvedTable, ResolvedEntry, NodeBucket } from './types'

export const LAYOUT_HINT =
  /^(wizard|summary|form|group|option-stack|scan|sev|reach|iso|is|mono|dz|stepper-card|stack)/

// @cloud/ui slot facts the generated contracts under-model: a component that renders
// a child element internally, so the child is NOT written as its own JSX and must be
// absorbed into the parent. Keyed by composition-root base → extra member bases it owns
// beyond its own BEM __elements. `<Field label=…>` renders its `<Label>` internally.
const SLOT_AUGMENT: Record<string, string[]> = {
  field: ['label'],
}

// Void / self-terminating HTML elements never open a subtree, so they must not push
// onto the nesting stack (an unclosed <input>/<br> would otherwise desync every
// ancestor below it). SVG shape children are authored self-closing in the artifacts.
const VOID = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param',
  'source', 'track', 'wbr',
])

const baseOf = (cls: string): string => cls.split(/__|--/)[0]!

function bucketFor(
  bases: string[],
  table: ResolvedTable,
): { bucket: NodeBucket; matchedClass: string | null; component: string | null; named: string[]; entry: ResolvedEntry | null } {
  const hits = bases.filter((b) => b in table.byClass).map((b) => [b, table.byClass[b]!] as const)
  if (hits.length > 0) {
    // prefer a component-bearing (clean) contract over a layout-ish one
    hits.sort((a, b) => (a[1].disposition.startsWith('clean') ? 0 : 1) - (b[1].disposition.startsWith('clean') ? 0 : 1))
    const [cls, e] = hits[0]!
    let bucket: NodeBucket
    if (e.disposition === 'unimplemented' || e.disposition === 'partial-drift') bucket = 'unimplemented'
    else if (e.disposition === 'html-decompose') bucket = 'html-decompose'
    else bucket = 'clean-mapped'
    return { bucket, matchedClass: cls, component: bucket === 'clean-mapped' ? (e.named[0] ?? null) : null, named: e.named, entry: e }
  }
  if (bases.some((b) => LAYOUT_HINT.test(b))) return { bucket: 'layout-residue', matchedClass: null, component: null, named: [], entry: null }
  return { bucket: 'offcontract-unknown', matchedClass: null, component: null, named: [], entry: null }
}

// The member bases a contract absorbs: its own BEM __elements arrive via the same-block
// check; its declared `children` and augmented slots are listed here. A multi-part
// composition (dropzone → FileList/FileRow, whose sub-parts share the `dropzone`
// contract) collapses because each sub-part absorbs the next via `children`.
function memberBasesOf(entry: ResolvedEntry | null, matchedClass: string): Set<string> {
  if (!entry) return new Set()
  return new Set([...entry.children, ...(SLOT_AUGMENT[matchedClass] ?? [])])
}

export function parseArtifactBody(html: string, startLine: number, table: ResolvedTable): IRNode[] {
  const lines = html.split('\n')
  const out: IRNode[] = []
  const ancestorsById = new Map<number, number[]>() // node id → recorded ancestor node ids (outer→inner)
  const entryById = new Map<number, ResolvedEntry | null>()
  let id = 0

  // Full element stack drives nesting. Each frame carries the recorded node id (or null
  // for class-less structural elements) so ancestor chains only surface real nodes.
  const stack: Array<{ tag: string; nodeId: number | null }> = []
  // Match opening tags, closing tags, and self-closing tags in one pass.
  const tokenRe = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    for (const m of line.matchAll(tokenRe)) {
      const closing = m[1] === '/'
      const tag = m[2]!.toLowerCase()
      const attrs = m[3]!
      const selfClose = m[4] === '/'

      if (closing) {
        // Pop to the matching open tag (tolerate stray/unbalanced markup).
        for (let s = stack.length - 1; s >= 0; s--) {
          if (stack[s]!.tag === tag) { stack.length = s; break }
        }
        continue
      }
      if (tag === 'script' || tag === 'style') continue // contents are not markup nodes

      const clsM = attrs.match(/class="([^"]*)"/)
      const classes = clsM ? clsM[1]!.split(/\s+/).filter((t) => /^[a-z]/.test(t)) : []
      let nodeId: number | null = null
      if (classes.length > 0) {
        const bases = [...new Set(classes.map(baseOf))]
        const { bucket, matchedClass, component, named, entry } = bucketFor(bases, table)
        nodeId = id++
        out.push({ id: nodeId, line: startLine + i, tag, classes, bases, bucket, matchedClass, component, named, absorbedBy: null })
        ancestorsById.set(nodeId, stack.map((f) => f.nodeId).filter((n): n is number => n !== null))
        entryById.set(nodeId, entry)
      }
      // Structural (class-less) elements still need a stack frame so nesting stays balanced.
      if (!selfClose && !VOID.has(tag)) stack.push({ tag, nodeId })
    }
  }

  // Composition pass: fold each member DOM node into the nearest contract-bearing
  // ancestor that owns it — same BEM block (.alert__title ⊂ .alert) or a declared
  // child (.step ⊂ .step-indicator, .file-row ⊂ .file-list). Absorbed members carry
  // no element of their own; the ancestor's single @cloud/ui call covers them.
  const byId = new Map(out.map((n) => [n.id, n]))
  for (const n of out) {
    if (n.matchedClass === null) continue // residue never absorbs
    const ancestors = ancestorsById.get(n.id) ?? []
    for (let a = ancestors.length - 1; a >= 0; a--) {
      const anc = byId.get(ancestors[a]!)!
      if (anc.matchedClass === null) continue // a residue container can't absorb
      const members = memberBasesOf(entryById.get(anc.id) ?? null, anc.matchedClass)
      const owns = n.matchedClass === anc.matchedClass || members.has(n.matchedClass)
      if (owns) { n.bucket = 'absorbed'; n.absorbedBy = anc.id; break }
    }
  }

  return out
}
