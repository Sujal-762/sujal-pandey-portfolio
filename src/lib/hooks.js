import { useEffect, useState } from "react";

export const cx = (...names) => names.filter(Boolean).join(" ");
export const EASE = [0.2, 0.7, 0.2, 1];

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Live prefers-reduced-motion value; false on the server and first client render (no hydration mismatch). */
export function useReducedMotionPref() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/** True once mounted in the browser. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Marks <html data-world="…"> with the world currently filling the middle of the viewport. */
export function useWorldTracker() {
  useEffect(() => {
    const worlds = [...document.querySelectorAll("[data-world]")];
    if (!worlds.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) document.documentElement.dataset.world = e.target.dataset.world;
      }),
      { rootMargin: "-50% 0px -50% 0px" }
    );
    worlds.forEach((w) => io.observe(w));
    return () => io.disconnect();
  }, []);
}

/** Tracks which section id is in the middle of the viewport. */
export function useActiveSection(ids) {
  const [active, setActive] = useState(null);
  const key = ids.join(",");
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    key.split(",").forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [key]);
  return active;
}

/**
 * Subtle "torch" light that follows the pointer — desktop fine pointers only, never with reduced motion.
 * Writes --mx / --my (percent) on the element. The cursor itself is never hidden or replaced.
 */
export function usePointerLight(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;
    let frame = 0;
    const onMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
        el.classList.add("is-lit");
      });
    };
    const onLeave = () => el.classList.remove("is-lit");
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [ref]);
}

/** Scrolls to an element id (respecting reduced motion) and moves focus to it. */
export function goTo(id, focusId = id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  const f = document.getElementById(focusId);
  if (f) f.focus({ preventScroll: true });
}
