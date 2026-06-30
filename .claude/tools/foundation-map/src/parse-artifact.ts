import type { IRNode, ResolvedTable, NodeBucket } from './types'

export const LAYOUT_HINT =
  /^(wizard|summary|form|group|option-stack|scan|sev|reach|iso|is|mono|dz|stepper-card|stack)/

const baseOf = (cls: string): string => cls.split(/__|--/)[0]!

function bucketFor(bases: string[], table: ResolvedTable): { bucket: NodeBucket; matchedClass: string | null; component: string | null } {
  const hits = bases.filter((b) => b in table.byClass).map((b) => [b, table.byClass[b]!] as const)
  if (hits.length > 0) {
    // prefer a component-bearing (clean) contract over a layout-ish one
    hits.sort((a, b) => (a[1].disposition.startsWith('clean') ? 0 : 1) - (b[1].disposition.startsWith('clean') ? 0 : 1))
    const [cls, e] = hits[0]!
    let bucket: NodeBucket
    if (e.disposition === 'unimplemented' || e.disposition === 'partial-drift') bucket = 'unimplemented'
    else if (e.disposition === 'html-decompose') bucket = 'html-decompose'
    else bucket = 'clean-mapped'
    // html-decompose maps to a raw HTML element (no @cloud/ui component); clean-* maps to a named component.
    return { bucket, matchedClass: cls, component: bucket === 'clean-mapped' ? (e.named[0] ?? null) : null }
  }
  if (bases.some((b) => LAYOUT_HINT.test(b))) return { bucket: 'layout-residue', matchedClass: null, component: null }
  return { bucket: 'offcontract-unknown', matchedClass: null, component: null }
}

export function parseArtifactBody(html: string, startLine: number, table: ResolvedTable): IRNode[] {
  const lines = html.split('\n')
  const out: IRNode[] = []
  let id = 0
  const tagRe = /<([a-zA-Z][\w-]*)\b([^>]*?)>/g
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    for (const m of line.matchAll(tagRe)) {
      const tag = m[1]!.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'br' || tag === 'meta') continue
      const clsM = m[2]!.match(/class="([^"]*)"/)
      if (!clsM) continue
      const classes = clsM[1]!.split(/\s+/).filter((t) => /^[a-z]/.test(t))
      if (classes.length === 0) continue
      const bases = [...new Set(classes.map(baseOf))]
      const { bucket, matchedClass, component } = bucketFor(bases, table)
      out.push({ id: id++, line: startLine + i, tag, classes, bases, bucket, matchedClass, component })
    }
  }
  return out
}
