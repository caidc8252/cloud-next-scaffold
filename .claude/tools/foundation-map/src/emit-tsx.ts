import type { IRNode } from './types'

export function emitTsx(nodes: IRNode[], componentName = 'AppPublish'): string {
  const used = new Set<string>()
  const body: string[] = []
  for (const n of nodes) {
    if (n.bucket === 'absorbed') {
      // Folded into its composition root's single @cloud/ui call — not its own element.
      body.push(`      {/* data-src={${n.id}} absorbed-by={${n.absorbedBy}} (${n.matchedClass}) */}`)
    } else if (n.bucket === 'clean-mapped' && n.component) {
      used.add(n.component)
      body.push(`      <${n.component} data-src={${n.id}} />`)
    } else if (n.bucket === 'html-decompose') {
      // deterministic raw-HTML map (e.g. .kv-grid -> <dl>); round-trippable as a native element
      body.push(`      <${n.tag} data-src={${n.id}} />`)
    } else {
      const tag = n.matchedClass ?? n.bases[0] ?? n.tag
      body.push(`      {/* data-src={${n.id}} ${n.bucket}:${tag} */}`)
    }
  }
  const imports = used.size > 0 ? `import { ${[...used].sort().join(', ')} } from '@cloud/ui'\n\n` : ''
  return `${imports}export function ${componentName}() {\n  return (\n    <>\n${body.join('\n')}\n    </>\n  )\n}\n`
}
