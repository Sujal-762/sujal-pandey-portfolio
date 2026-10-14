// Shared state between the scrolling DOM chapters and the WebGL stage.
// A tiny mutable store: per-frame values are read directly (no React re-renders per frame);
// discrete changes (selection, hover, motion mode) are broadcast with emit() and read via useJourneyState().
import { useEffect, useState } from "react";

export const CHAPTERS = ["top", "evidence", "transform", "archive", "contact"];

export const journey = {
  target: 0,           // chapter units from the scroll position (u = chapter index + local progress)
  current: 0,          // smoothed value the camera, particles and DOM cues all use
  intro: 0,            // 1 → 0 during the opening dolly (first visit per session, full motion only)
  reduced: false,      // calm motion: still 3D and still alive, but no camera flights, parallax or intro
  motionFromSystem: false, // calm because of the OS reduced-motion setting (no choice saved on this site)
  time: 0,             // ambient clock (s): advanced once per frame by the camera rig, slower in calm mode
  amp: 1,              // ambient motion amplitude: 1 full, CALM_AMP calm (eased, never a hard switch)
  wall: false,         // camera close-up on the profile wall (opening view) + its HTML panel
  sketch: false,       // the enlarged illustrated portrait dialog is open
  focus: null,         // evidence object id the camera is examining (room)
  hover: null,         // evidence object or archive entry under the pointer / keyboard focus
  entry: null,         // selected archive entry id
  labEvent: 0,         // selected event on the fictional device timeline
  scanStart: -1,       // performance.now() of the last fingerprint scan
  anchors: new Map(),  // id → { el, world, range } projected each frame by the camera rig
  stageReady: false,
};

// Calm mode keeps the environment breathing (dust, light, scans) at a fraction of the amplitude and speed;
// what it removes is camera travel, parallax and anything large or fast.
export const CALM_AMP = 0.3;
export const CALM_SPEED = 0.45;

const listeners = new Set();
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
export const emit = () => listeners.forEach((fn) => fn(journey));

/** Update discrete journey state and notify subscribers. */
export function setJourney(patch) {
  let changed = false;
  for (const k in patch) if (journey[k] !== patch[k]) { journey[k] = patch[k]; changed = true; }
  if (changed) emit();
}

/** React hook: re-render when a selected slice of the journey changes. */
export function useJourneyState(select) {
  const [value, setValue] = useState(() => select(journey));
  useEffect(() => subscribe((j) => setValue(select(j))), []); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}

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
