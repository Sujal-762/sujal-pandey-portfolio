import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Mail, Copy, Check, CodeXml, X, ScanLine } from "lucide-react";
import Poster from "./Poster.jsx";
import { journey } from "./store.js";
import { skipIntro, useAnchor } from "./useJourney.js";
import { hotspots, labNotes, labAnchors } from "../content/journey.js";
import { contacts, profile } from "../content/site.js";
import { caseStudies } from "../content/caseStudies.js";
import { casePath } from "../lib/routes.js";
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

// ---------------------------------------------------------------- 01 · Room

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
      </div>
      <a className="invite cue" style={cue(-1, 0.45)} href="#evidence">
        Enter the scene <ArrowDown size={15} aria-hidden="true" />
      </a>
      <button type="button" className="skip-intro" onClick={skipIntro}>Skip intro</button>
      <p className="frame-caption">Illustrative set · no real case or evidence depicted</p>
    </Chapter>
  );
}

// ---------------------------------------------------------------- 02 · Evidence

function HotspotDot({ spot, onOpen, active }) {
  const ref = useAnchor(`hs-${spot.id}`, spot.world, [0.95, 2.0]);
  return (
    <button
      ref={ref}
      type="button"
      className={cx("hs-dot", active && "is-active")}
      style={{ "--fx": `${spot.fallback[0]}%`, "--fy": `${spot.fallback[1]}%` }}
      onClick={() => onOpen(spot.id)}
      tabIndex={-1}
      aria-hidden="true"
    >
      <span className="hs-dot__ring" />
      <span className="hs-dot__label">{spot.label}</span>
    </button>
  );
}

export function EvidenceChapter() {
  const [open, setOpen] = useState(null);
  const panelTitle = useRef({});

  const show = (id) => {
    setOpen(id);
    requestAnimationFrame(() => panelTitle.current[id]?.focus());
  };
  // Focus always returns to the item in the Evidence index (the 3D dots are a pointer-only enhancement).
  const close = () => {
    const id = open;
    setOpen(null);
    requestAnimationFrame(() => document.querySelector(`[data-index="${id}"]`)?.focus());
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Chapter id="evidence" h="260vh" poster="room" labelledBy="evidence-title">
      <div className="evidence__head cue" style={cue(-1, 0.97)}>
        <p className="chapter-label">02 · The evidence table</p>
        <h2 id="evidence-title" className="chapter-title" tabIndex={-1}>Explore the evidence</h2>
      </div>

      <div className="profile-lines" aria-label="Profile">
        <p className="cue" style={cue(0.1, 0.97)}>Third-year B.Sc. Forensic Science</p>
        <p className="cue" style={cue(0.2, 0.97)}>Lovely Professional University, India</p>
        <p className="cue" style={cue(0.3, 0.97)}>Expected graduation 2027</p>
      </div>

      <div className="hs-layer cue" style={cue(0.04, 0.97)}>
        {hotspots.map((s) => (
          <HotspotDot key={s.id} spot={{ ...s }} active={open === s.id} onOpen={show} />
        ))}
      </div>

      <nav className="evidence-index cue" style={cue(-1, 0.99)} aria-label="Evidence index">
        <p className="evidence-index__title">Evidence index · illustrative props</p>
        <ul>
          {hotspots.map((s, i) => (
            <li key={s.id}>
              <button type="button" data-index={s.id} aria-expanded={open === s.id}
                aria-controls={`hs-panel-${s.id}`} className={cx(open === s.id && "is-active")}
                onClick={() => (open === s.id ? close() : show(s.id))}>
                <span className="evidence-index__n" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {hotspots.map((s) => (
        <div key={s.id} id={`hs-panel-${s.id}`} className="hs-panel" role="region" aria-labelledby={`hs-title-${s.id}`} hidden={open !== s.id}>
          <p className="hs-panel__kicker">{s.label}</p>
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

// ---------------------------------------------------------------- 03 · Transform

export function TransformChapter() {
  return (
    <Chapter id="transform" h="260vh" poster="lab" labelledBy="transform-title">
      <h2 id="transform-title" className="visually-hidden">From physical evidence to digital data</h2>
      <p className="caption caption--mono cue" style={cue(0.0, 0.26)}>Scan · ridge card (illustrative prop)</p>
      <p className="caption cue" style={cue(0.34, 0.74)}>Physical traces become <em>data</em>.</p>
    </Chapter>
  );
}

// ---------------------------------------------------------------- 04 · Lab

function LabAnchor({ a, show }) {
  const ref = useAnchor(`lab-${a.id}`, a.world, [2.98, 3.96]);
  return <span ref={ref} className={cx("lab-anchor", show && "is-shown")} aria-hidden="true"><span>{a.label}</span></span>;
}

export function LabChapter() {
  const [mode, setMode] = useState("fingerprint");
  const [scan, setScan] = useState("idle");
  const [event, setEvent] = useState(0);
  const tabs = useRef([]);
  const events = useRef([]);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = (m) => { setMode(m); journey.labMode = m; };
  const runScan = () => {
    const calm = document.documentElement.classList.contains("calm");
    journey.scanStart = performance.now();
    setScan(calm ? "done" : "scanning");
    clearTimeout(timer.current);
    if (!calm) timer.current = setTimeout(() => setScan("done"), 2400);
  };
  const pickEvent = (i) => { setEvent(i); journey.labEvent = i; };
  const keys = (e, i, n, list, act) => {
    const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const j = (next + n) % n;
    act(j);
    list.current[j]?.focus();
  };
  const MODES = [["fingerprint", "Fingerprint"], ["device", "Device"]];

  return (
    <Chapter id="lab" h="250vh" poster="lab" labelledBy="lab-title">
      {labAnchors.map((a) => <LabAnchor key={a.id} a={a} show={mode === "fingerprint" && scan === "done"} />)}

      <div className="lab-panel cue" style={cue(-1, 0.97)}>
        <p className="chapter-label">03 · The digital lab</p>
        <h2 id="lab-title" className="chapter-title" tabIndex={-1}>The digital lab</h2>
        <p className="illustrative" data-illustrative=""><span aria-hidden="true">●</span> Fictional / illustrative data</p>

        <div className="lab-tabs" role="tablist" aria-label="Lab instrument">
          {MODES.map(([id, label], i) => (
            <button key={id} ref={(el) => (tabs.current[i] = el)} type="button" role="tab" id={`labtab-${id}`}
              aria-selected={mode === id} aria-controls={`labpanel-${id}`} tabIndex={mode === id ? 0 : -1}
              onClick={() => choose(id)} onKeyDown={(e) => keys(e, i, MODES.length, tabs, (j) => choose(MODES[j][0]))}>
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id="labpanel-fingerprint" aria-labelledby="labtab-fingerprint" hidden={mode !== "fingerprint"} className="lab-body">
          <p>A ridge pattern rebuilt from the particles of the card — generated by this site, not a real print.</p>
          <button type="button" className="lab-action" onClick={runScan} disabled={scan === "scanning"}>
            <ScanLine size={17} aria-hidden="true" /> {scan === "scanning" ? "Scanning…" : scan === "done" ? "Scan again" : "Run illustrative scan"}
          </button>
          <p className="lab-status" role="status">
            {scan === "done" && "Scan complete. Visual demonstration only — no comparison or identification was performed."}
          </p>
        </div>

        <div role="tabpanel" id="labpanel-device" aria-labelledby="labtab-device" hidden={mode !== "device"} className="lab-body">
          <p><strong>{labNotes.digital.title}.</strong> {labNotes.digital.description}</p>
          <p className="lab-fiction">Fictional timeline · no real device was examined</p>
          <ol className="timeline" aria-label="Fictional device timeline">
            {labNotes.events.map((ev, i) => (
              <li key={ev.time}>
                <button ref={(el) => (events.current[i] = el)} type="button" aria-pressed={event === i}
                  tabIndex={event === i ? 0 : -1} onClick={() => pickEvent(i)}
                  onKeyDown={(e) => keys(e, i, labNotes.events.length, events, pickEvent)}>
                  <span className="timeline__time">{ev.time}</span> {ev.label}
                </button>
              </li>
            ))}
          </ol>
          <p className="lab-note" aria-live="polite">{labNotes.events[event].note}</p>
        </div>
      </div>
    </Chapter>
  );
}

// ---------------------------------------------------------------- 05 · Trace

export function TraceChapter() {
  return (
    <Chapter id="trace" h="210vh" poster="archive" labelledBy="trace-title">
      <h2 id="trace-title" className="visually-hidden">From data to documented record</h2>
      <p className="caption cue" style={cue(0.06, 0.42)}>Data alone is not a <em>conclusion</em>.</p>
      <p className="caption cue" style={cue(0.52, 0.96)}>In the archive, every claim needs a <em>source</em>.</p>
    </Chapter>
  );
}

// ---------------------------------------------------------------- 06 · Archive

export function ArchiveChapter() {
  return (
    <Chapter id="archive" h="190vh" poster="archive" labelledBy="archive-title">
      <div className="archive-hero cue" style={cue(-1, 1.01)}>
        <p className="chapter-label">04 · The archive</p>
        <h2 id="archive-title" className="archive-hero__title" tabIndex={-1}>The Archive</h2>
        {caseStudies.length === 0 ? (
          <p className="archive-hero__empty">Dossiers in preparation.</p>
        ) : (
          <ol className="archive-hero__list">
            {caseStudies.map((c) => (
              <li key={c.slug}><a href={casePath(c.slug)}><span className="archive-hero__tag">Public case study</span>{c.title}</a></li>
            ))}
          </ol>
        )}
        <p className="archive-hero__note">
          Public case studies appear only once their sources are verified — always kept separate from
          academic projects and demonstrations.
        </p>
        <a className="text-link" href="/archive/">Open the archive index <ArrowUpRight size={15} aria-hidden="true" /></a>
      </div>
    </Chapter>
  );
}

// ---------------------------------------------------------------- 07 · Contact

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
    <Chapter id="contact" h="150vh" poster="archive" className="chapter--last" labelledBy="contact-title">
      <div className="finale cue" style={cue(-1, 1.01)}>
        <p className="chapter-label">05 · Contact</p>
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
