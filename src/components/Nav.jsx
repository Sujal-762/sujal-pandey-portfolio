import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "motion/react";
import { Menu, X } from "lucide-react";
import { EASE, cx, useActiveSection } from "../lib/hooks.js";
import { useJourneyState } from "../journey/store.js";
import { setMotionPreference } from "../journey/useJourney.js";

// `id` = a chapter on the home page; `href` = a separate page.
export const NAV_SECTIONS = [
  { id: "profile", label: "About" },
  { id: "achievements", label: "Achievements" },
  { id: "leadership", label: "Leadership" },
  { id: "archive", label: "Archive" },
  { href: "/archive/", label: "Case studies" },
  { id: "contact", label: "Contact" },
];

/** Visitor-controlled motion level. Overrides the OS setting; remembered on this device. */
function MotionToggle({ className }) {
  const reduced = useJourneyState((j) => j.reduced);
  return (
    <button type="button" className={cx("motion-toggle", className)} aria-pressed={!reduced} aria-label="Full motion"
      onClick={() => setMotionPreference(reduced ? "full" : "reduced")}>
      <span className="motion-toggle__dot" aria-hidden="true" />
      <span aria-hidden="true">Motion · {reduced ? "Calm" : "Full"}</span>
    </button>
  );
}

export default function Nav({ onHome }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(onHome ? NAV_SECTIONS.filter((s) => s.id).map((s) => s.id) : []);
  const toggleRef = useRef(null);
  const sheetRef = useRef(null);
  const base = onHome ? "" : "/";
  const hrefOf = (s) => s.href ?? `${base}#${s.id}`;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, restDelta: 0.001 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile sheet: lock page scroll, focus the first link, trap Tab, close on Escape / desktop resize.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("menu-open");
    sheetRef.current?.querySelector("a")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); return; }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const items = [toggleRef.current, ...sheetRef.current.querySelectorAll("a, button")];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    };
    const mq = window.matchMedia("(min-width: 900px)");
    const onMq = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      root.classList.remove("menu-open");
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  return (
    <>
      <header className={cx("nav", (scrolled || open) && "nav--solid")} data-ui="">
        <div className="container nav__inner">
          <a className="brand" href={`${base}#top`} onClick={() => setOpen(false)}>
            <span className="brand__mark" aria-hidden="true">SP</span>
            <span className="brand__text">
              <span className="brand__name">Sujal Pandey</span>
              <span className="brand__role">Forensic Science · LPU</span>
            </span>
          </a>

          <nav className="nav__desktop" aria-label="Primary">
            <ul>
              {NAV_SECTIONS.map((s) => (
                <li key={s.label}>
                  <a href={hrefOf(s)} aria-current={s.id && active === s.id ? "location" : undefined}>
                    {s.label}
                    {s.id && active === s.id && (
                      <motion.span className="nav__marker" layoutId="nav-marker" aria-hidden="true"
                        transition={{ duration: 0.45, ease: EASE }} />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {onHome && <MotionToggle className="motion-toggle--bar" />}

          <button ref={toggleRef} className="nav__toggle icon-btn" type="button"
            aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
        <motion.div className="nav__progress" style={{ scaleX: progress }} aria-hidden="true" />
      </header>

      {/* Outside <header>: its backdrop-filter would otherwise trap this fixed sheet inside the bar. */}
      <AnimatePresence>
        {open && (
          <motion.nav id="mobile-menu" ref={sheetRef} className="sheet" aria-label="Mobile" data-ui=""
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}>
            <ul>
              {NAV_SECTIONS.map((s, i) => (
                <motion.li key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE, delay: 0.05 + i * 0.05 }}>
                  <a href={hrefOf(s)} onClick={() => setOpen(false)}
                    aria-current={s.id && active === s.id ? "location" : undefined}>
                    <span className="sheet__num" aria-hidden="true">0{i + 1}</span>
                    {s.label}
                  </a>
                </motion.li>
              ))}
            </ul>
            {onHome && <MotionToggle className="motion-toggle--sheet" />}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
