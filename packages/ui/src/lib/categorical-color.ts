// Deterministic content → categorical color bucket.
//
// Maps an arbitrary string (e.g. a device-model code, a category name) onto one
// of 6 stable buckets (0..5), aligned with the categorical soft tokens
// (cat-1..6). The same input always yields the same bucket; different inputs
// may collide onto the same bucket — an accepted trade-off for stable,
// no-config tinting. The bucket → concrete class mapping lives with the
// consumer (see <ColorTile>) so the literal Tailwind class names stay where the
// scanner can find them. Consumed by <ColorTile> and available to any UI that
// wants reproducible per-label colors without wiring a palette by hand.

// Number of categorical buckets — matches the cat-1..6 soft token family.
export const CATEGORICAL_COLOR_COUNT = 6

// FNV-1a (32-bit). Cheap, dependency-free, and stable across runs/platforms —
// we only need an even-ish spread over 8 buckets, not cryptographic strength.
function hashString(seed: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    // 32-bit FNV prime multiply via shifts; >>> 0 keeps it an unsigned int32.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0
  }
  return hash >>> 0
}

// Pick a stable bucket [0, CATEGORICAL_COLOR_COUNT) for the given seed.
// Same seed → same bucket.
export function categoricalColorIndex(seed: string): number {
  return hashString(seed) % CATEGORICAL_COLOR_COUNT
}
