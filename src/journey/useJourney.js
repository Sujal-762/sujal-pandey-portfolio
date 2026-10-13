import { useCallback, useEffect, useRef, useState } from "react";
import { CHAPTERS, journey, measureTarget } from "./store.js";

/** Can this browser create a WebGL context at all? */
function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const WORLD_OF = ["scene", "scene", "scene", "lab", "archive", "archive", "archive"];

/**
 * Drives the home journey:
 *  - measures scroll → journey.target (chapter units)
 *  - writes --lp (local progress 0..1) on every chapter, from the SAME smoothed value the camera uses,
 *    so typography and camera stay in sync
 *  - decides the mode: "loading" → "3d" when the stage renders, or "calm" (reduced motion / no WebGL / failure)
 */
export function useJourney() {
  const [mode, setMode] = useState("loading");
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const root = document.documentElement;
    const calm = root.classList.contains("calm") || !webglAvailable();
    if (calm) { root.classList.add("calm"); setMode("calm"); }

    // Opening dolly: first visit per session, 3D only, starting at the top.
    try {
      if (!calm && !sessionStorage.getItem("sp-intro") && window.scrollY < 40) {
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

    let frame = 0;
    const last = new Array(CHAPTERS.length).fill(-1);
    let lastWorld = "";
    const tick = () => {
      // Without the 3D stage nothing smooths `current`, so it simply follows the scroll position.
      if (!journey.stageReady) journey.current = journey.target;
      const u = journey.current;
      sections.forEach((el, i) => {
        if (!el) return;
        const lp = Math.round(Math.min(1, Math.max(0, u - i)) * 1000) / 1000;
        if (lp !== last[i]) { el.style.setProperty("--lp", lp); last[i] = lp; }
      });
      const world = WORLD_OF[Math.min(WORLD_OF.length - 1, Math.floor(u))];
      if (world !== lastWorld) { root.dataset.world = world; lastWorld = world; }
      if (journey.intro <= 0 && root.classList.contains("intro-on")) root.classList.remove("intro-on");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
