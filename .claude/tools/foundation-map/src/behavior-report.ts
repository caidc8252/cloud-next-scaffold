import type { BehaviorReport, BehaviorUnit } from './types'

// Behaviors a stateful @cloud/ui component owns once adopted (spec §4d).
export const ABSORBED_PATTERNS =
  /^(updatePanels|updateIndicator|updateNav|setStep|goNext|goPrev|showStep|openModal|closeModal|setTab|switchTab)$/

export function analyzeBehavior(script: string, startLine: number): BehaviorReport {
  const units: BehaviorUnit[] = []
  const fnRe = /function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g
  let m: RegExpExecArray | null
  while ((m = fnRe.exec(script)) !== null) {
    const name = m[1]!
    // brace-match from the opening { to find the unit end
    let depth = 0
    let i = m.index + m[0].length - 1
    for (; i < script.length; i++) {
      if (script[i] === '{') depth++
      else if (script[i] === '}') { depth--; if (depth === 0) { i++; break } }
    }
    const slice = script.slice(m.index, i)
    const loc = slice.split('\n').length
    const before = script.slice(0, m.index).split('\n').length
    const kind = ABSORBED_PATTERNS.test(name) ? 'absorbed' : 'custom'
    const reason = kind === 'absorbed'
      ? 'state-switching owned by a stateful @cloud/ui component'
      : 'custom logic (validation / simulation / filter / summary)'
    units.push({ name, startLine: startLine + before - 1, loc, kind, reason })
  }
  const totalLoc = units.reduce((s, u) => s + u.loc, 0)
  const absorbedLoc = units.filter((u) => u.kind === 'absorbed').reduce((s, u) => s + u.loc, 0)
  const customLoc = totalLoc - absorbedLoc
  return { totalLoc, absorbedLoc, customLoc, customFraction: totalLoc ? customLoc / totalLoc : 0, units }
}
