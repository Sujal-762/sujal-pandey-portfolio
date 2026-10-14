// ONE timeline for the whole journey, in chapter units (see store.js).
// Every scroll-driven quantity — camera path, lights, fog, particle phases, environment visibility — is a
// pure function of u, so scrolling forwards, backwards, quickly or jumping always produces a coherent frame.
// Idle (time-driven) motion is layered on top in the scene components and switched off for reduced motion.
//
// Chapters: 0 room · 1 evidence · 2 transformation · 3 digital archive · 4 contact

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// World anchors (metres)
export const TABLE_Y = 0.9;
export const CARD = [0.28, TABLE_Y + 0.006, 0.12];       // fingerprint card on the table
export const LAB = [0, 0, -24];                           // digital archive centre (floor)
export const PRINT = [LAB[0], 1.65, LAB[2]];              // reconstructed fingerprint centre
export const WALL_Z = LAB[2] - 1.7;                       // archive plate wall (behind the print)

// Camera keyframes: [u, position, lookAt]
export const CAMERA_KEYS = [
  [0.0, [0.0, 1.85, 5.8], [0.0, 1.2, -1.6]],      // establishing: room, board, table
  [0.85, [0.35, 1.6, 3.4], [0.1, 1.0, -0.7]],      // moving toward the table
  [1.0, [0.55, 1.5, 2.45], [0.12, 0.93, -0.05]],
  [1.45, [-0.25, 1.42, 1.75], [-0.05, 0.9, -0.02]], // over the table — evidence objects
  [1.95, [0.55, 1.3, 1.05], [0.26, 0.9, 0.08]],    // focus: fingerprint card
  [2.25, [0.33, 1.14, 0.52], [0.28, 0.9, 0.1]],    // close on the card — scan
  [2.55, [0.2, 1.2, -1.2], [0.1, 1.25, -7.0]],     // follow the particles away
  [2.85, [0.05, 1.55, -13.5], [0.0, 1.6, -22.0]],
  [3.0, [-0.45, 1.72, -18.6], [-1.15, 1.62, -24.2]], // arrive: the archive
  [3.5, [-0.95, 1.78, -18.9], [-1.25, 1.7, -24.6]],
  [3.98, [0.15, 1.86, -18.8], [-0.9, 1.7, -24.6]],
  [4.0, [0.1, 2.0, -18.4], [-0.6, 1.7, -24.6]],       // contact: pull back, settle
  [4.99, [0.0, 2.85, -15.6], [0.0, 1.45, -24.6]],
];

// Still compositions used in calm mode (camera cuts instead of flights). The transformation chapter is told
// in three stills — card scan, disintegration, reconstruction — so calm visitors still see the change.
const REST_U = [0.35, 1.45, null, 3.4, 4.6];
const TRANSFORM_STILLS = [[0.34, 2.2], [0.68, 2.5], [1.01, 2.88]];
export function restU(target) {
  const i = Math.min(REST_U.length - 1, Math.floor(target));
  if (i !== 2) return REST_U[i];
  return TRANSFORM_STILLS.find(([end]) => target - 2 < end)[1];
}

export function atmosphere(u) {
  const red = 1 - smooth(2.3, 2.8, u);
  const warm = 1 - smooth(2.35, 2.7, u);
  const blue = smooth(2.4, 3.0, u) * (1 - 0.55 * smooth(4.15, 4.9, u));
  const roomVis = 1 - smooth(2.45, 2.7, u);
  const labVis = smooth(2.55, 3.0, u);
  const density = mix(0.055, 0.16, smooth(2.4, 2.62, u) * (1 - smooth(2.7, 3.0, u)))
    * (u > 2.85 ? 0.55 : 1) * (1 + 0.7 * smooth(4.1, 4.9, u));
  return { red: clamp01(red), warm: clamp01(warm), blue, roomVis, labVis, density };
}

// Fog / clear colour keyframes (sRGB 0..1)
export const FOG_KEYS = [
  [0.0, [0.043, 0.027, 0.027]],
  [2.3, [0.05, 0.022, 0.024]],
  [2.75, [0.008, 0.016, 0.04]],
  [3.2, [0.006, 0.02, 0.05]],
  [4.0, [0.006, 0.02, 0.05]],
  [4.99, [0.004, 0.01, 0.026]],
];

export function sampleKeys(keys, u) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [u0, a] = keys[i], [u1, b] = keys[i + 1];
    if (u <= u1) { const t = easeInOut((u - u0) / (u1 - u0)); return a.map((v, k) => mix(v, b[k], t)); }
  }
  return keys[keys.length - 1][1];
}

export function particlePhases(u) {
  return {
    reveal: smooth(2.12, 2.3, u),      // particles lift off the card as the scan passes
    scatter: smooth(2.22, 2.7, u),     // disintegrate into the room
    assemble: smooth(2.62, 3.05, u),   // reconstruct as the archive fingerprint
    colour: smooth(2.38, 2.9, u),      // crimson → cyan
    dim: 0.55 * smooth(4.15, 4.9, u),  // settle for the closing scene
  };
}

// Card scan line on the physical fingerprint card
export const cardScan = (u) => smooth(1.98, 2.24, u);

// Profile wall: right-hand section of the back wall, beside the evidence board (centre, size in metres)
export const WALL = [2.68, 1.82, -3.165];
export const BOARD_SHIFT = -0.6; // the evidence board sits left of centre, beside the profile wall
export const WALL_SIZE = [2.8, 2.2];
export const WALL_RANGE = [0, 0.75]; // the wall can be inspected from the opening view

// Ranges in which object selection drives camera close-ups
export const EVIDENCE_RANGE = [0.95, 2.05];
export const ARCHIVE_RANGE = [2.95, 4.05];
