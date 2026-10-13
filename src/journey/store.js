// Shared state between the scrolling DOM chapters and the WebGL stage.
// A tiny mutable store (no React re-renders per frame).
//
// Progress is measured in CHAPTER UNITS: u = chapterIndex + localProgress (0..1).
// `target` comes straight from the scroll position (so refresh / jump-to-section is always valid);
// `current` follows it with critically-damped smoothing (cinematic inertia, coherent reversal).

export const CHAPTERS = ["top", "evidence", "transform", "lab", "trace", "archive", "contact"];

export const journey = {
  target: 0,
  current: 0,
  intro: 0,            // 1 → 0 during the opening dolly (first visit per session only)
  labMode: "fingerprint",
  scanStart: -1,       // performance.now() when a lab scan was triggered
  anchors: new Map(),  // id → { el, world: [x,y,z] } projected each frame by the stage
  stageReady: false,
};

const listeners = new Set();
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const emit = () => listeners.forEach((fn) => fn(journey));

/** Exponential damping toward a target that is frame-rate independent. */
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Measures the scroll position against the chapter sections → chapter units. */
export function measureTarget() {
  const vh = window.innerHeight;
  const y = window.scrollY;
  let u = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const el = document.getElementById(CHAPTERS[i]);
    if (!el) continue;
    const top = el.offsetTop;
    const span = Math.max(1, el.offsetHeight - vh);
    if (y >= top) u = i + Math.min(1, (y - top) / span);
  }
  return Math.min(CHAPTERS.length - 0.001, Math.max(0, u));
}
