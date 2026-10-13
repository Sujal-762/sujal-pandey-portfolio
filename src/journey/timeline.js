// ONE timeline for the whole journey, in chapter units (see store.js).
// Every visual quantity — camera, lights, fog, particles, environment visibility — is a pure function
// of u, so scrolling forwards, backwards, quickly or jumping always produces a coherent frame.
//
// Chapters: 0 room · 1 evidence · 2 transform · 3 lab · 4 trace · 5 archive · 6 contact

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// World anchors (metres)
export const TABLE_Y = 0.9;
export const CARD = [0.28, TABLE_Y + 0.006, 0.12];      // fingerprint card on the table
export const LAB = [0, 0, -24];                          // digital lab centre (floor)
export const PRINT = [LAB[0], 1.65, LAB[2]];             // lab fingerprint centre
export const DESK = [0, 0, -48];                         // archive desk centre (floor)
export const DESK_Y = 0.78;
export const PAPER = [DESK[0] + 0.05, DESK_Y + 0.004, DESK[2] + 0.15];

// Camera keyframes: [u, position, lookAt]
export const CAMERA_KEYS = [
  [0.0, [0.0, 1.85, 5.8], [0.0, 1.2, -1.6]],     // establishing: room, board, table
  [0.85, [0.35, 1.6, 3.4], [0.1, 1.0, -0.7]],     // moving toward the table
  [1.0, [0.55, 1.5, 2.45], [0.12, 0.93, -0.05]],
  [1.45, [-0.25, 1.42, 1.75], [-0.05, 0.9, -0.02]], // over the table — hotspots
  [1.95, [0.55, 1.3, 1.05], [0.26, 0.9, 0.08]],   // focus: fingerprint card
  [2.25, [0.33, 1.14, 0.52], [0.28, 0.9, 0.1]],   // close on the card — scan
  [2.55, [0.2, 1.2, -1.2], [0.1, 1.25, -7.0]],    // follow the particles away
  [2.85, [0.05, 1.55, -13.5], [0.0, 1.6, -22.0]],
  [3.0, [-0.45, 1.7, -18.7], [-1.15, 1.6, -24.0]], // arrive in the lab (print framed right of the panel)
  [3.5, [-0.85, 1.62, -19.5], [-1.3, 1.6, -24.0]],
  [3.95, [0.05, 1.78, -19.1], [-1.0, 1.6, -24.0]],
  [4.15, [0.55, 2.05, -18.9], [-0.2, 1.35, -27.0]], // follow the data trace
  [4.55, [0.2, 1.7, -35.5], [0.05, 1.0, -44.0]],
  [4.92, [0.1, 1.55, -46.4], [0.05, DESK_Y, -47.9]],
  [5.0, [0.0, 1.7, -46.1], [0.03, DESK_Y, -48.0]], // the archive desk
  [5.5, [-0.45, 1.9, -45.9], [-0.05, DESK_Y, -48.1]],
  [5.95, [0.35, 2.1, -45.8], [0.0, DESK_Y, -48.2]],
  [6.0, [0.0, 2.45, -45.6], [0.0, DESK_Y + 0.05, -48.3]], // contact: rise, settle
  [6.99, [0.0, 3.3, -44.3], [0.0, 0.95, -48.6]],
];

// Light / atmosphere curves (0..1 intensities)
export function atmosphere(u) {
  const red = 1 - smooth(2.3, 2.8, u) + 0.55 * smooth(4.55, 5.15, u) - 0.25 * smooth(6.0, 6.8, u);
  const warm = 1 - smooth(2.35, 2.7, u) + 0.45 * smooth(4.7, 5.2, u) - 0.25 * smooth(6.0, 6.8, u);
  const blue = smooth(2.4, 3.0, u) * (1 - smooth(4.35, 4.85, u));
  const roomVis = 1 - smooth(2.45, 2.7, u);
  const labVis = smooth(2.55, 3.0, u) * (1 - smooth(4.4, 4.75, u));
  const deskVis = smooth(4.35, 4.85, u);
  // Fog: thickens to dissolve the room, thins in the lab, settles at the end.
  const density = mix(0.055, 0.16, smooth(2.4, 2.62, u) * (1 - smooth(2.7, 3.0, u)))
    * (u > 2.85 && u < 4.3 ? 0.55 : 1) * (1 + 0.8 * smooth(6.1, 6.9, u));
  return { red: clamp01(red), warm: clamp01(warm), blue, roomVis, labVis, deskVis, density };
}

// Fog / clear colour keyframes (sRGB hex)
export const FOG_KEYS = [
  [0.0, [0.043, 0.027, 0.027]],
  [2.3, [0.05, 0.022, 0.024]],
  [2.75, [0.008, 0.016, 0.04]],
  [3.2, [0.006, 0.02, 0.05]],
  [4.3, [0.006, 0.02, 0.05]],
  [4.85, [0.035, 0.026, 0.024]],
  [6.99, [0.02, 0.018, 0.018]],
];

export function sampleKeys(keys, u) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [u0, a] = keys[i], [u1, b] = keys[i + 1];
    if (u <= u1) { const t = easeInOut((u - u0) / (u1 - u0)); return a.map((v, k) => mix(v, b[k], t)); }
  }
  return keys[keys.length - 1][1];
}

// Particle phases
export function particlePhases(u) {
  return {
    reveal: smooth(2.12, 2.3, u),      // particles lift off the card as the scan passes
    scatter: smooth(2.22, 2.7, u),     // spread into the room
    assemble: smooth(2.62, 3.05, u),   // re-form as the lab fingerprint
    colour: smooth(2.38, 2.9, u),      // crimson → cyan
    trace: smooth(4.0, 4.9, u),        // flow along the data trace onto paper
    ink: smooth(4.7, 5.0, u),          // cyan → ink blue on paper
    fade: smooth(6.15, 6.9, u),        // settle at the end
  };
}

// Card scan line (on the physical fingerprint card)
export const cardScan = (u) => smooth(1.98, 2.24, u);
