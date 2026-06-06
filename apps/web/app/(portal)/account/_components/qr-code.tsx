"use client";

// A decorative QR-shaped grid, deterministic from a seed — stands in for the
// real enrollment QR without hand-drawing artwork. Ported from the prototype.
export function QrCode({ seed = "toms", px = 156 }: { seed?: string; px?: number }) {
  const N = 21;
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rnd = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  const finder = (r: number, c: number): boolean | null => {
    const box = (br: number, bc: number) => r >= br && r < br + 7 && c >= bc && c < bc + 7;
    const ring = (br: number, bc: number) => {
      const lr = r - br;
      const lc = c - bc;
      return (lr === 0 || lr === 6 || lc === 0 || lc === 6) || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
    };
    if (box(0, 0)) return ring(0, 0);
    if (box(0, N - 7)) return ring(0, N - 7);
    if (box(N - 7, 0)) return ring(N - 7, 0);
    return null;
  };
  const cells: boolean[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const f = finder(r, c);
      cells.push(f === null ? rnd() > 0.52 : f);
    }
  }
  return (
    <div
      className="grid gap-px rounded bg-white p-1.5"
      style={{
        width: px,
        height: px,
        gridTemplateColumns: `repeat(${N},1fr)`,
        gridTemplateRows: `repeat(${N},1fr)`,
      }}
    >
      {cells.map((on, i) => (
        <span key={i} className={on ? "bg-black" : "bg-transparent"} />
      ))}
    </div>
  );
}
