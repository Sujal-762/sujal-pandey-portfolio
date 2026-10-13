// Deterministic, illustrative friction-ridge pattern (not a real fingerprint).

export function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Loop-like pattern of wobbling ridges with small breaks. Returns SVG path strings. */
export function ridgePaths({ count = 26, cx = 260, cy = 300, spacing = 8.6, seed = 762, step = 0.07 } = {}) {
  const rnd = mulberry32(seed);
  const paths = [];
  for (let i = 0; i < count; i++) {
    const r = 10 + i * spacing;
    const p1 = rnd() * Math.PI * 2, p2 = rnd() * Math.PI * 2;
    let d = "", pen = false, gap = 0;
    for (let t = 0; t <= Math.PI * 2 + 0.001; t += step) {
      const wob = 1 + 0.035 * Math.sin(3 * t + p1) + 0.018 * Math.sin(7 * t + p2);
      const s = Math.sin(t);
      const x = cx + r * 0.82 * Math.cos(t) * wob;
      // Upper half rounder, lower half flatter; the core offset fades to 0 at the midline (no seams).
      const y = cy + r * 1.08 * s * wob * (s > 0 ? 0.72 : 1) - i * 1.2 * Math.max(0, -s);
      if (gap > 0) { gap--; pen = false; continue; }
      if (pen && rnd() < 0.012) { gap = 1 + Math.floor(rnd() * 2); pen = false; continue; }
      d += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      pen = true;
    }
    paths.push(d);
  }
  return paths;
}
