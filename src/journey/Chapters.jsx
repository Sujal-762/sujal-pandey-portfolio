import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Mail, Copy, Check, CodeXml, X, ScanLine, Lock } from "lucide-react";
import Poster from "./Poster.jsx";
import { journey, setJourney, useJourneyState } from "./store.js";
import { skipIntro, useAnchor, setMotionPreference } from "./useJourney.js";
import { hotspots, labNotes, labAnchors } from "../content/journey.js";
import { archiveEntries, ARCHIVE_FILTERS } from "../content/archive.js";
import { contacts, profile } from "../content/site.js";
import { wall } from "../content/record.js";
import { InspectWallButton, WallPanel, SketchDialog } from "./WallUI.jsx";
import { LinkedInMark } from "../components/ui.jsx";
import { cx } from "../lib/hooks.js";

/** A tall scroll section whose frame stays in view while its local progress (--lp) runs 0 → 1. */
function Chapter({ id, h, poster, labelledBy, className, children }) {
  return (
    <section id={id} className={cx("chapter", `chapter--${id}`, className)} style={{ "--h": h }} aria-labelledby={labelledBy}>
      <div className="chapter__frame">
        {poster && <Poster kind={poster} />}
        {children}
      </div>
    </section>
  );
}

/** Fades in between local progress a…b of its chapter (pure CSS from --lp). */
const cue = (a, b) => ({ "--a": a, "--b": b });

/** Hover/focus on a DOM control highlights the matching 3D object (and vice versa via journey.hover). */
const hoverProps = (id) => ({
  onMouseEnter: () => setJourney({ hover: id }),
  onMouseLeave: () => journey.hover === id && setJourney({ hover: null }),
  onFocus: () => setJourney({ hover: id }),
  onBlur: () => journey.hover === id && setJourney({ hover: null }),
});

/** Escape closes the open panel; focus returns to the control that opened it. */
function useEscape(active, onClose) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

// ---------------------------------------------------------------- 01 · Room

/**
 * Shown only when calm motion comes from the device's reduced-motion setting (not a choice made here):
 * the scene stays calm by default, and the visitor can opt in to camera movement. Client-only.
 */
function MotionNotice() {
  const fromSystem = useJourneyState((j) => j.motionFromSystem);
  const [dismissed, setDismissed] = useState(false);
  if (!fromSystem || dismissed) return null;
  return (
    <div className="motion-notice" role="note" data-ui="">
      <p>Calm motion is on because your device asks for reduced motion.</p>
      <div className="motion-notice__actions">
        <button type="button" className="motion-notice__on" onClick={() => setMotionPreference("full")}>Turn on full motion</button>
        <button type="button" className="motion-notice__keep" onClick={() => setDismissed(true)}>Keep calm</button>
      </div>
    </div>
  );
}

export function RoomChapter() {
  return (
    <Chapter id="top" h="170vh" poster="room" labelledBy="hero-title">
      <div className="hero">
        <p className="kicker cue" style={cue(-1, 0.55)}>Forensic science · Student portfolio</p>
        <h1 id="hero-title" className="hero__name cue" style={cue(-1, 0.72)} tabIndex={-1}>
          <span className="hero__line">Sujal</span> <span className="hero__line">Pandey</span>
        </h1>
        <p className="hero__roles cue" style={cue(-1, 0.66)}>
          <span>Forensic Science Student</span>
          <span>Aspiring Crime Scene Investigator</span>
        </p>
        <p className="hero__id cue" style={cue(-1, 0.62)}>
          {wall.plate.map((l, i) => <span key={l}>{i === 2 ? l.replace("Expected Graduation:", "Expected graduation") : l}</span>)}
        </p>
        <div className="cue" style={cue(-1, 0.6)}><InspectWallButton /></div>
      </div>
      <a className="invite cue" style={cue(-1, 0.45)} href="#evidence">
        Enter the scene <ArrowDown size={15} aria-hidden="true" />
      </a>
      <button type="button" className="skip-intro" onClick={skipIntro} data-ui="">Skip intro</button>
      <MotionNotice />
      <WallPanel />
      <SketchDialog />
      <p className="frame-caption">Illustrative set · no real case or evidence depicted</p>
    </Chapter>
  );
}

// ---------------------------------------------------------------- 02 · Evidence

function HotspotDot({ spot, active, onOpen }) {
  const ref = useAnchor(`hs-${spot.id}`, spot.world, [0.95, 2.0]);
  return (
    <button
      ref={ref}
      type="button"
      className={cx("hs-dot", active && "is-active")}
      style={{ "--fx": `${spot.fallback[0]}%`, "--fy": `${spot.fallback[1]}%` }}
      onClick={() => onOpen(spot.id)}
      {...hoverProps(spot.id)}
      tabIndex={-1}
      aria-hidden="true"
      data-ui=""
    >
      <span className="hs-dot__ring" />
      <span className="hs-dot__label">{spot.label}</span>
    </button>
  );
}

export function EvidenceChapter() {
  // The open panel IS the camera focus: a 3D click, a dot or the Evidence index all set journey.focus.
  const open = useJourneyState((j) => j.focus);
  const panelTitle = useRef({});
  const lastOpen = useRef(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => panelTitle.current[open]?.focus({ preventScroll: true }));
    else if (lastOpen.current) document.querySelector(`[data-index="${lastOpen.current}"]`)?.focus({ preventScroll: true });
    lastOpen.current = open;
  }, [open]);

  const show = (id) => setJourney({ focus: id });
  const close = () => setJourney({ focus: null });
  useEscape(!!open, close);

  return (
    <Chapter id="evidence" h="260vh" poster="room" labelledBy="evidence-title">
      <div className="evidence__head cue" style={cue(-1, 0.97)}>
        <p className="chapter-label">02 · The evidence table</p>
        <h2 id="evidence-title" className="chapter-title" tabIndex={-1}>Explore the evidence</h2>
        <p className="evidence__hint">Select an object to examine it.</p>
      </div>

      <div className="profile-lines" aria-label="Profile">
        <p className="cue" style={cue(0.1, 0.97)}>Third-year B.Sc. Forensic Science</p>
        <p className="cue" style={cue(0.2, 0.97)}>Lovely Professional University, India</p>
        <p className="cue" style={cue(0.3, 0.97)}>Expected graduation 2027</p>
      </div>

      <div className="hs-layer cue" style={cue(0.04, 0.97)}>
        {hotspots.map((s) => <HotspotDot key={s.id} spot={s} active={open === s.id} onOpen={show} />)}
      </div>

      <nav className="evidence-index cue" style={cue(-1, 0.99)} aria-label="Evidence index" data-ui="">
        <p className="evidence-index__title">Evidence index · illustrative props</p>
        <ul>
          {hotspots.map((s, i) => (
            <li key={s.id}>
              <button type="button" data-index={s.id} aria-expanded={open === s.id}
                aria-controls={`hs-panel-${s.id}`} className={cx(open === s.id && "is-active")}
                onClick={() => (open === s.id ? close() : show(s.id))} {...hoverProps(s.id)}>
                <span className="evidence-index__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {hotspots.map((s) => (
        <div key={s.id} id={`hs-panel-${s.id}`} className="hs-panel" role="region" aria-labelledby={`hs-title-${s.id}`}
          hidden={open !== s.id} data-ui="">
          <p className="hs-panel__kicker">{s.label} · close-up</p>
          <h3 id={`hs-title-${s.id}`} tabIndex={-1} ref={(el) => (panelTitle.current[s.id] = el)}>{s.title}</h3>
          <p>{s.body}</p>
          <button type="button" className="hs-panel__close" onClick={close} aria-label={`Close: ${s.title}`}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </Chapter>
  );
}

// ---------------------------------------------------------------- 03 · Transformation

export function TransformChapter() {
  return (
    <Chapter id="transform" h="250vh" poster="lab" labelledBy="transform-title">
      <h2 id="transform-title" className="visually-hidden">From physical evidence to digital analysis</h2>
      <p className="caption caption--mono cue" style={cue(0.0, 0.26)}>Scan · ridge card (illustrative prop)</p>
      <p className="caption cue" style={cue(0.34, 0.74)}>Physical traces become <em>data</em>.</p>
    </Chapter>
  );
}

// ---------------------------------------------------------------- 04 · Digital forensics archive

function LabAnchor({ a, show }) {
  const ref = useAnchor(`lab-${a.id}`, a.world, [2.95, 4.05]);
  return <span ref={ref} className={cx("lab-anchor", show && "is-shown")} aria-hidden="true"><span>{a.label}</span></span>;
}

function PrintDemo({ onScanned }) {
  const [scan, setScan] = useState("idle");
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = () => {
    journey.scanStart = performance.now();
    setScan("scanning");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setScan("done"); onScanned(true); }, journey.reduced ? 0 : 2400);
  };
  return (
    <div className="demo">
      <button type="button" className="lab-action" onClick={run} disabled={scan === "scanning"}>
        <ScanLine size={17} aria-hidden="true" /> {scan === "scanning" ? "Scanning…" : scan === "done" ? "Scan again" : "Run illustrative scan"}
      </button>
      <p className="lab-status" role="status">
        {scan === "done" && "Scan complete. Visual demonstration only — no comparison or identification was performed."}
      </p>
    </div>
  );
}

function DeviceDemo() {
  const event = useJourneyState((j) => j.labEvent);
  const refs = useRef([]);
  const pick = (i) => setJourney({ labEvent: i });
  const onKey = (e, i) => {
    const n = labNotes.events.length;
    const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const j = (next + n) % n;
    pick(j);
    refs.current[j]?.focus();
  };
  return (
    <div className="demo">
      <p><strong>{labNotes.digital.title}.</strong> {labNotes.digital.description}</p>
      <p className="lab-fiction">Fictional timeline · no real device was examined</p>
      <ol className="timeline" aria-label="Fictional device timeline">
        {labNotes.events.map((ev, i) => (
          <li key={ev.time}>
            <button ref={(el) => (refs.current[i] = el)} type="button" aria-pressed={event === i}
              tabIndex={event === i ? 0 : -1} onClick={() => pick(i)} onKeyDown={(e) => onKey(e, i)}>
              <span className="timeline__time">{ev.time}</span> {ev.label}
            </button>
          </li>
        ))}
      </ol>
      <p className="lab-note" aria-live="polite">{labNotes.events[event].note}</p>
    </div>
  );
}

export function ArchiveChapter() {
  const selected = useJourneyState((j) => j.entry);
  const hover = useJourneyState((j) => j.hover);
  const [filter, setFilter] = useState("all");
  const [scanned, setScanned] = useState(false);
  const titles = useRef({});
  const lastOpen = useRef(null);

  useEffect(() => { setJourney({ filter }); }, [filter]);
  useEffect(() => {
    if (selected) requestAnimationFrame(() => titles.current[selected]?.focus({ preventScroll: true }));
    else if (lastOpen.current) document.querySelector(`[data-entry="${lastOpen.current}"]`)?.focus({ preventScroll: true });
    lastOpen.current = selected;
  }, [selected]);

  const close = () => setJourney({ entry: null });
  useEscape(!!selected, close);
  const visible = archiveEntries.filter((e) => filter === "all" || e.group === filter);

  return (
    <Chapter id="archive" h="280vh" poster="lab" labelledBy="archive-title">
      {labAnchors.map((a) => <LabAnchor key={a.id} a={a} show={selected === "demo-print" && scanned} />)}

      <div className="archive-ui cue" style={cue(-1, 1.01)} data-ui="">
        <p className="chapter-label">03 · Digital forensics archive</p>
        <h2 id="archive-title" className="chapter-title" tabIndex={-1}>The Archive</h2>
        <p className="archive-ui__meta">
          {archiveEntries.length} entries, each labelled by type. Demonstrations use fictional or illustrative data;
          nothing here is real casework.
        </p>

        <div className="archive-filters" role="group" aria-label="Filter the archive">
          {ARCHIVE_FILTERS.map((f) => {
            const n = f.id === "all" ? archiveEntries.length : archiveEntries.filter((e) => e.group === f.id).length;
            return (
              <button key={f.id} type="button" className={cx("afilter", filter === f.id && "is-on")} aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}>
                {f.label} <span className="afilter__n">{n}</span>
              </button>
            );
          })}
        </div>

        <ol className="archive-list" aria-label="Archive entries">
          {visible.map((e) => (
            <li key={e.id}>
              <button type="button" data-entry={e.id} aria-expanded={selected === e.id} aria-controls={`entry-${e.id}`}
                className={cx("archive-item", selected === e.id && "is-open", hover === e.id && "is-hover", e.sealed && "is-sealed")}
                onClick={() => setJourney({ entry: selected === e.id ? null : e.id })} {...hoverProps(e.id)}>
                <span className="archive-item__code">{e.code}</span>
                <span className="archive-item__title">{e.title}</span>
                <span className="archive-item__type">{e.type}</span>
                <span className={cx("status", e.sealed && "status--sealed", e.demo && "status--demo")}>{e.status}</span>
              </button>
            </li>
          ))}
        </ol>
        <a className="text-link archive-ui__more" href="/archive/">
          Case-study index, sources & editorial standard <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>

      {archiveEntries.map((e) => (
        <article key={e.id} id={`entry-${e.id}`} className="entry-panel" aria-labelledby={`entry-title-${e.id}`}
          hidden={selected !== e.id} data-ui="">
          <p className="entry-panel__kicker">{e.type} · {e.code}</p>
          <h3 id={`entry-title-${e.id}`} tabIndex={-1} ref={(el) => (titles.current[e.id] = el)}>{e.title}</h3>
          <p className={cx("status", e.sealed && "status--sealed", e.demo && "status--demo")}>{e.status}</p>
          {e.demo && <p className="illustrative" data-illustrative=""><span aria-hidden="true">●</span> Fictional / illustrative data</p>}
          <p className="entry-panel__summary">{e.summary}</p>
          {e.sealed && <p className="entry-panel__sealed"><Lock size={14} aria-hidden="true" /> Sealed — no details are published until verified.</p>}
          {e.demo === "print" && <PrintDemo onScanned={setScanned} />}
          {e.demo === "device" && <DeviceDemo />}
          {e.url && (
            <a className="text-link" href={e.url} target="_blank" rel="noopener noreferrer">
              Open the public source<span className="visually-hidden">: {e.title} (opens in a new tab)</span> <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {e.href && <a className="text-link" href={e.href}>Read the dossier <ArrowUpRight size={14} aria-hidden="true" /></a>}
          <button type="button" className="hs-panel__close" onClick={close} aria-label={`Close: ${e.title}`}>
            <X size={16} aria-hidden="true" />
          </button>
        </article>
      ))}
    </Chapter>
  );
}

// ---------------------------------------------------------------- 05 · Contact

function CopyEmail() {
  const [state, setState] = useState("idle");
  const t = useRef();
  useEffect(() => () => clearTimeout(t.current), []);
  const copy = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(contacts.email); ok = true; } catch { ok = false; }
    setState(ok ? "copied" : "failed");
    clearTimeout(t.current);
    t.current = setTimeout(() => setState("idle"), 2400);
  };
  return (
    <>
      <button type="button" className="finale__copy" onClick={copy} aria-label={state === "copied" ? "Email address copied" : "Copy email address"}>
        {state === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      </button>
      <span className="finale__status" role="status">{state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy — select the address instead" : ""}</span>
    </>
  );
}

export function ContactChapter() {
  return (
    <Chapter id="contact" h="150vh" poster="lab" className="chapter--last" labelledBy="contact-title">
      <div className="finale cue" style={cue(-1, 1.01)} data-ui="">
        <p className="chapter-label">04 · Contact</p>
        <h2 id="contact-title" className="finale__name">Sujal Pandey</h2>
        <p className="finale__role">Forensic Science Student</p>
        <p className="finale__line">Open to academic collaboration, internships and professional enquiries.</p>
        <ul className="finale__links" role="list">
          <li className="finale__row">
            <a href={`mailto:${contacts.email}`}><Mail size={18} aria-hidden="true" /> {contacts.email}</a>
            <CopyEmail />
          </li>
          <li className="finale__row">
            <a href={contacts.linkedin.url} target="_blank" rel="me noopener noreferrer">
              <LinkedInMark size={18} /> LinkedIn<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
          <li className="finale__row">
            <a href={contacts.github.url} target="_blank" rel="me noopener noreferrer">
              <CodeXml size={18} aria-hidden="true" /> GitHub<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
        </ul>
        <p className="finale__small">
          © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {profile.name} · Student portfolio ·
          Not affiliated with or endorsed by {profile.institution} · Scenes are original illustrations, not real evidence or cases.
        </p>
      </div>
    </Chapter>
  );
}
