import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Expand, X } from "lucide-react";
import { profile } from "../content/site.js";
import { about, achievements, leadership, events, workshops } from "../content/record.js";
import portraitUrl from "../assets/portrait/sujal-pandey-portrait.jpg";
import quizPosterUrl from "../assets/achievements/mobile-security-quiz-award.jpg";
import iffPhotoUrl from "../assets/achievements/international-forensic-forum-2025.jpg";
import creativeVerdictUrl from "../assets/evidencia/creative-verdict-2025.jpg";
import unsolvedDisplayUrl from "../assets/evidencia/unsolved-2026-display.webp";
import unsolvedOriginalUrl from "../assets/evidencia/unsolved-2026.png";

// The personal record: About → Achievements & Recognition → Leadership (Evidencia + events) → Workshops.
// Normal-flow sections between the evidence table and the transformation; they scroll over the fixed 3D stage
// (the camera holds on the table, still breathing). Everything is plain, crawlable HTML — readable without
// animation, JavaScript or WebGL. Images keep their natural aspect ratio; essential text is never only in an image.

const IMAGES = {
  "mobile-security-quiz": { src: quizPosterUrl },
  "iff-2025": { src: iffPhotoUrl },
  "creative-verdict-2025": { src: creativeVerdictUrl },
  "unsolved-2026": { src: unsolvedDisplayUrl, full: unsolvedOriginalUrl },
};

/** An image with a designed fallback if the file fails to load (also catches failures before hydration). */
function SafeImage({ fallback, ...props }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return fallback;
  return <img ref={ref} onError={() => setFailed(true)} {...props} />; // eslint-disable-line jsx-a11y/alt-text
}

/** Full-size view of a poster or photograph (native <dialog>: focus contained, Escape closes, focus returns). */
function MediaDialog({ title, src, alt, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    document.documentElement.classList.add("modal-open");
    return () => document.documentElement.classList.remove("modal-open");
  }, []);
  return (
    <dialog ref={ref} className="media-dialog" aria-label={title} onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="media-dialog__inner">
        <p className="media-dialog__title">{title}</p>
        <img src={src} alt={alt} className="media-dialog__img" />
        <button type="button" className="media-dialog__close" onClick={() => ref.current.close()} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </dialog>
  );
}

/** A framed image at its natural aspect ratio, with a full-size view. */
function Figure({ id, image, caption, title, className }) {
  const [open, setOpen] = useState(false);
  const files = IMAGES[id];
  return (
    <figure className={className}>
      <div className="media">
        <SafeImage src={files.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async"
          className="media__img" fallback={<span className="media__missing" style={{ aspectRatio: `${image.width} / ${image.height}` }}>Image unavailable</span>} />
        <button type="button" className="media__expand" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <Expand size={14} aria-hidden="true" /> View full size<span className="visually-hidden">: {title}</span>
        </button>
      </div>
      {caption && <figcaption className="media__caption">{caption}</figcaption>}
      {open && <MediaDialog title={`${title} · ${caption ?? ""}`} src={files.full ?? files.src} alt={image.alt} onClose={() => setOpen(false)} />}
    </figure>
  );
}

// ---------------------------------------------------------------- About

export function ProfileSection() {
  return (
    <section id="profile" className="casefile casefile--first" aria-labelledby="profile-title" data-ui="">
      <div className="casefile__inner about">
        <figure className="portrait">
          <div className="portrait__frame">
            <SafeImage
              src={portraitUrl}
              alt="Sujal Pandey, smiling, wearing glasses, a dark suit and black turtleneck, standing in front of a green hedge."
              className="portrait__img"
              width="1220"
              height="1211"
              loading="lazy"
              decoding="async"
              fallback={<div className="portrait__fallback" role="img" aria-label="Portrait unavailable"><span aria-hidden="true">SP</span></div>}
            />
          </div>
          <figcaption className="portrait__caption">{profile.name} · {profile.programme}</figcaption>
        </figure>

        <div className="about__body">
          <p className="casefile__label">About</p>
          <h2 id="profile-title" className="casefile__title" tabIndex={-1}>{profile.name}</h2>
          <p className="about__lede">{about.intro}</p>
          <p className="about__text">{about.focus}</p>
          <dl className="facts">
            <div><dt>Education</dt><dd>{profile.programme}</dd></div>
            <div><dt>Institution</dt><dd>{profile.institution}</dd></div>
            <div><dt>Expected graduation</dt><dd>{profile.expectedGraduation}</dd></div>
            <div><dt>Year</dt><dd>{profile.yearOfStudy}</dd></div>
          </dl>
          <div className="interests">
            <h3 className="casefile__sub">Areas of interest</h3>
            <ul>{about.areasOfInterest.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Achievements & Recognition

export function AchievementsSection() {
  return (
    <section id="achievements" className="casefile" aria-labelledby="achievements-title" data-ui="">
      <div className="casefile__inner">
        <header className="casefile__head">
          <p className="casefile__label">Recognition</p>
          <h2 id="achievements-title" className="casefile__title" tabIndex={-1}>Achievements &amp; Recognition</h2>
        </header>
        <div className="achievements">
          {achievements.map((a) => (
            <article key={a.id} id={`achievement-${a.id}`} className="achievement" aria-labelledby={`ach-${a.id}`}>
              <Figure id={a.id} image={a.image} title={a.title} caption={a.image.kind} className="achievement__media" />
              <div className="achievement__body">
                <p className="achievement__code">Exhibit {a.exhibit}</p>
                <h3 id={`ach-${a.id}`} className="achievement__title">{a.title}</h3>
                <dl className="meta">
                  {a.details.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
                <p className="achievement__text">{a.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Leadership: Evidencia + events

export function LeadershipSection() {
  return (
    <section id="leadership" className="casefile" aria-labelledby="leadership-title" data-ui="">
      <div className="casefile__inner">
        <header className="casefile__head leadership">
          <p className="casefile__label">Leadership</p>
          <h2 id="leadership-title" className="casefile__title leadership__name" tabIndex={-1}>{leadership.name}</h2>
          <p className="leadership__role">{leadership.role} <span>· {leadership.institution}</span></p>
          <p className="leadership__text">{leadership.description}</p>
          <p className="leadership__text">{leadership.focus}</p>
        </header>

        <h3 className="casefile__sub">Events</h3>
        <p className="events__context">{leadership.context}</p>
        <div className="events">
          {events.map((e) => (
            <article key={e.id} className="event" aria-labelledby={`ev-${e.id}`}>
              <Figure id={e.id} image={e.image} title={e.title} caption="Event poster" className="event__media" />
              <div className="event__body">
                <h4 id={`ev-${e.id}`} className="event__title">{e.title}</h4>
                <p className="event__date"><time dateTime={e.dateTime}>{e.date}</time></p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Workshops & academic exposure

export function WorkshopsSection() {
  return (
    <section id="workshops" className="casefile casefile--last" aria-labelledby="workshops-title" data-ui="">
      <div className="casefile__inner">
        <header className="casefile__head">
          <p className="casefile__label">Professional development</p>
          <h2 id="workshops-title" className="casefile__title">Workshops &amp; Academic Exposure</h2>
        </header>
        <ol className="log">
          {workshops.map((w) => (
            <li key={w.id} className="log__row">
              <p className="log__date">{w.date ?? ""}</p>
              <div className="log__body">
                <h3 className="log__title">{w.title}</h3>
                <p className="log__where">{[w.code, w.where].filter(Boolean).join(" · ")}</p>
              </div>
              {w.related && (
                <a className="log__link" href={`#achievement-${w.related}`}>
                  Related achievement <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
