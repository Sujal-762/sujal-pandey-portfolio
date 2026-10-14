import { useEffect, useRef } from "react";
import { ArrowUpRight, Expand, ScanSearch, X } from "lucide-react";
import { journey, setJourney, useJourneyState } from "./store.js";
import { openWallTarget } from "./useJourney.js";
import { wall } from "../content/record.js";
import sketchUrl from "../assets/sketch/sujal-pandey-sketch.svg";

// HTML side of the 3D profile wall: the button that opens the close-up, the readable panel shown during it
// (same content as the wall, plus working links — the keyboard / screen-reader / small-screen path), and the
// enlarged illustration.

/** Opens the profile-wall close-up (3D mode only; hidden in calm/no-WebGL mode via CSS). */
export function InspectWallButton() {
  return (
    <button type="button" className="inspect-wall" data-ui="" id="inspect-wall"
      onClick={() => { journey.intro = 0; document.documentElement.classList.remove("intro-on"); setJourney({ wall: true }); }}>
      <ScanSearch size={16} aria-hidden="true" /> Inspect the profile wall
    </button>
  );
}

export function WallPanel() {
  const open = useJourneyState((j) => j.wall);
  const title = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    document.documentElement.classList.toggle("wall-on", open);
    if (open) requestAnimationFrame(() => title.current?.focus({ preventScroll: true }));
    // Closed with focus lost inside the now-hidden panel (Escape / 3D scroll-away): return it to the opener.
    // Navigating from the panel moves focus to the target section instead, which is left alone.
    else if (wasOpen.current && (!document.activeElement || document.activeElement === document.body)) {
      document.getElementById("inspect-wall")?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !journey.sketch && setJourney({ wall: false });
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => () => document.documentElement.classList.remove("wall-on"), []);

  const close = () => { setJourney({ wall: false }); document.getElementById("inspect-wall")?.focus({ preventScroll: true }); };

  return (
    <section className="wall-panel" aria-labelledby="wall-title" hidden={!open} data-ui="">
      <p className="wall-panel__kicker">Profile wall · close-up</p>
      <h2 id="wall-title" ref={title} tabIndex={-1} className="wall-panel__name">Sujal Pandey</h2>
      <p className="wall-panel__discipline">Forensic Science</p>
      <ul className="wall-panel__plate">
        {wall.plate.map((l) => <li key={l}>{l}</li>)}
      </ul>

      <div className="wall-panel__group">
        <h3>Areas of interest</h3>
        <ul className="wall-panel__list">
          {wall.interests.map((i) => (
            <li key={i}>
              {i === "Digital Forensics"
                ? <button type="button" className="wall-panel__link" onClick={() => openWallTarget("archive")}>{i} <span>· Digital archive</span> <ArrowUpRight size={14} aria-hidden="true" /></button>
                : i}
            </li>
          ))}
        </ul>
      </div>
      <div className="wall-panel__group">
        <h3>Achievements</h3>
        <ul className="wall-panel__list">{wall.achievements.map((a) => <li key={a}>{a}</li>)}</ul>
        <button type="button" className="wall-panel__link" onClick={() => openWallTarget("achievements")}>
          Achievements &amp; Recognition <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="wall-panel__group">
        <h3>Leadership</h3>
        <p className="wall-panel__lead"><strong>Evidencia</strong> · {wall.leadership.role}</p>
        <button type="button" className="wall-panel__link" onClick={() => openWallTarget("leadership")}>
          Evidencia &amp; events <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="wall-panel__actions">
        <button type="button" className="wall-panel__btn" onClick={() => openWallTarget("sketch")}>
          <Expand size={15} aria-hidden="true" /> View illustration
        </button>
        <button type="button" className="wall-panel__btn" onClick={() => openWallTarget("about")}>About</button>
      </div>
      <button type="button" className="wall-panel__close" onClick={close} aria-label="Close the profile wall">
        <X size={18} aria-hidden="true" />
      </button>
    </section>
  );
}

/** The illustrated portrait, enlarged (native <dialog>: focus contained, Escape closes, focus returns). */
export function SketchDialog() {
  const open = useJourneyState((j) => j.sketch);
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="media-dialog sketch-dialog" aria-labelledby="sketch-title"
      onClose={() => setJourney({ sketch: false })}
      onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="media-dialog__inner">
        <p id="sketch-title" className="media-dialog__title">Illustrated portrait · original artwork</p>
        <img src={sketchUrl} width="600" height="760" className="media-dialog__img"
          alt="Pencil-style illustration of Sujal Pandey: swept-back wavy hair, rectangular glasses, a gentle smile, short beard, turtleneck and suit jacket." />
        <p className="media-dialog__note">A stylised illustration — not a photograph and not a forensic facial composite.</p>
        <button type="button" className="media-dialog__close" onClick={() => ref.current.close()} aria-label="Close illustration">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </dialog>
  );
}
