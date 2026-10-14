import { useCallback, useEffect, useState } from "react";
import { CHAPTERS, journey, measureTarget, setJourney } from "./store.js";

/** Can this browser create a WebGL context at all? */
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const WORLD_OF = ["scene", "scene", "scene", "lab", "lab"];
const MOTION_KEY = "sp-motion";

/**
 * Visitor's motion choice. "full" / "reduced" override the operating-system setting (stored);
 * the <html class="motion-reduced"> flag is also set by the inline head script before first paint.
 */
export function setMotionPreference(pref) {
  try { localStorage.setItem(MOTION_KEY, pref); } catch { /* storage blocked: session only */ }
  const reduced = pref === "reduced";
  document.documentElement.classList.toggle("motion-reduced", reduced);
  if (!reduced) journey.current = journey.target; // resume from where the visitor is
  if (reduced) { journey.intro = 0; document.documentElement.classList.remove("intro-on"); }
  setJourney({ reduced, motionFromSystem: false });
}

/**
 * Drives the home journey:
 *  - measures scroll → journey.target (chapter units)
 *  - writes --lp (local progress 0..1) on every chapter. With full motion it uses the same smoothed value as
 *    the camera (typography locked to camera motion); with reduced motion it follows the scroll directly.
 *  - decides the mode: "loading" → "3d" when the stage renders, or "calm" (no WebGL / WebGL failure)
 */
export function useJourney() {
  const [mode, setMode] = useState("loading");

  useEffect(() => {
    const root = document.documentElement;
    let saved = null;
    try { saved = localStorage.getItem(MOTION_KEY); } catch { /* storage blocked */ }
    setJourney({
      reduced: root.classList.contains("motion-reduced"),
      // Calm because the operating system asked for it (not the visitor's own choice here): offer full motion.
      motionFromSystem: !saved && root.classList.contains("motion-reduced"),
    });
    journey.amp = journey.reduced ? 0.3 : 1;
    if (!webglAvailable()) { root.classList.add("calm"); setMode("calm"); }

    // Opening dolly: first visit per session, full motion only, starting at the top.
    try {
      if (!journey.reduced && !root.classList.contains("calm") && !sessionStorage.getItem("sp-intro") && window.scrollY < 40) {
        journey.intro = 1;
        root.classList.add("intro-on");
      }
      sessionStorage.setItem("sp-intro", "1");
    } catch { /* storage blocked */ }

    const sections = CHAPTERS.map((id) => document.getElementById(id));
    const onScroll = () => {
      journey.target = measureTarget();
      if (journey.intro > 0 && window.scrollY > 40) journey.intro = Math.min(journey.intro, 0.35);
    };
    onScroll();
    journey.current = journey.target;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // One DOM rAF loop (cheap: writes a handful of CSS variables only when they change).
    let frame = 0;
    const last = new Array(CHAPTERS.length).fill(-1);
    let lastWorld = "";
    const tick = () => {
      if (!journey.stageReady) journey.current = journey.target;
      const u = journey.reduced ? journey.target : journey.current;
      sections.forEach((el, i) => {
        if (!el) return;
        const lp = Math.round(Math.min(1, Math.max(0, u - i)) * 1000) / 1000;
        if (lp !== last[i]) { el.style.setProperty("--lp", lp); last[i] = lp; }
      });
      const world = WORLD_OF[Math.min(WORLD_OF.length - 1, Math.floor(u))];
      if (world !== lastWorld) { root.dataset.world = world; lastWorld = world; }
      if (journey.intro <= 0 && root.classList.contains("intro-on")) root.classList.remove("intro-on");
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => { if (!document.hidden) { cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", onVisibility);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      root.classList.remove("intro-on", "has-3d");
    };
  }, []);

  const onReady = useCallback(() => {
    document.documentElement.classList.add("has-3d");
    setMode("3d");
  }, []);

  const onFail = useCallback(() => {
    journey.stageReady = false;
    journey.intro = 0;
    document.documentElement.classList.remove("has-3d", "intro-on");
    document.documentElement.classList.add("calm");
    setMode("calm");
  }, []);

  return { mode, onReady, onFail };
}

/** Skips the opening scene: stops the dolly and jumps to the evidence chapter. */
export function skipIntro() {
  journey.intro = 0;
  document.documentElement.classList.remove("intro-on");
  const el = document.getElementById("evidence");
  if (el) {
    window.scrollTo({ top: el.offsetTop, behavior: "auto" });
    document.getElementById("evidence-title")?.focus({ preventScroll: true });
  }
}

/** Registers a DOM element whose position follows a 3D world point (projected by the camera rig). */
export function useAnchor(id, world, range) {
  return useCallback((el) => {
    if (el) journey.anchors.set(id, { el, world, range });
    else journey.anchors.delete(id);
  }, [id, world, range]);
}
