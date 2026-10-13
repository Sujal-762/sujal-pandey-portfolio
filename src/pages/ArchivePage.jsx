import { useMemo, useState } from "react";
import { Search, ArrowUpRight, GraduationCap } from "lucide-react";
import { caseStudies } from "../content/caseStudies.js";
import { projects, categories } from "../content/projects.js";
import { backgroundReading } from "../content/sources.js";
import { DISCIPLINES, RECORD_TYPES, disciplineLabel } from "../content/taxonomy.js";
import { profile } from "../content/site.js";
import { casePath } from "../lib/routes.js";
import { cx } from "../lib/hooks.js";

const TYPES = RECORD_TYPES.filter((t) => t.id !== "demo");
const catLabel = (id) => categories.find((c) => c.id === id)?.label ?? disciplineLabel(id);

/** /archive/ — the full, searchable archive index, editorial standard, sources and academic record. */
export default function ArchivePage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [discipline, setDiscipline] = useState("all");

  const records = useMemo(() => [
    ...caseStudies.map((c) => ({ kind: "case", id: c.slug, title: c.title, summary: c.summary, disciplines: c.disciplines,
      extra: c.evidenceTypes, meta: [c.jurisdiction, c.period].filter(Boolean).join(" · "), href: casePath(c.slug) })),
    ...projects.map((p) => ({ kind: "project", id: p.slug, title: p.title, summary: p.summary, disciplines: [p.category],
      extra: p.methods, meta: p.status, project: p })),
  ], []);
  const q = query.trim().toLowerCase();
  const visible = records.filter((r) =>
    (type === "all" || r.kind === type) &&
    (discipline === "all" || r.disciplines.includes(discipline)) &&
    (!q || [r.title, r.summary, ...r.disciplines.map(disciplineLabel), ...r.extra].join(" ").toLowerCase().includes(q)));

  return (
    <main id="main" tabIndex={-1} className="page archive-page">
      <div className="page__inner">
        <header className="page-head">
          <p className="chapter-label">Archive index</p>
          <h1 className="page-head__title">The Archive</h1>
          <p className="page-head__lede">
            Verified public case studies and academic work — each type labelled and kept separate. Case studies are
            published only after their sources have been checked.
          </p>
        </header>

        <dl className="types">
          {TYPES.map((t) => (
            <div key={t.id}><dt><span className="stamp">{t.label}</span></dt><dd>{t.definition}</dd></div>
          ))}
        </dl>

        <div className="finder" role="search">
          <label className="finder__search">
            <Search size={17} aria-hidden="true" />
            <span className="visually-hidden">Search the archive</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search case, discipline or evidence type" autoComplete="off" />
          </label>
          <div className="finder__row">
            <div className="finder__chips" role="group" aria-label="Record type">
              {[{ id: "all", plural: "All records" }, ...TYPES].map((t) => (
                <button key={t.id} type="button" className={cx("chip", type === t.id && "is-on")} aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.plural}</button>
              ))}
            </div>
            <label className="finder__select">
              <span>Discipline</span>
              <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                <option value="all">All disciplines</option>
                {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>
          </div>
          <p className="finder__count" role="status">{visible.length} {visible.length === 1 ? "record" : "records"}</p>
        </div>

        {TYPES.filter((t) => type === "all" || type === t.id).map((t) => {
          const list = visible.filter((r) => r.kind === t.id);
          const none = t.id === "case" ? caseStudies.length === 0 : projects.length === 0;
          return (
            <section key={t.id} className="drawer" aria-labelledby={`drawer-${t.id}`}>
              <h2 id={`drawer-${t.id}`} className="drawer__title">{t.plural} <span className="drawer__count">{list.length}</span></h2>
              {list.length ? (
                <ol className="dossiers">
                  {list.map((r) => (
                    <li key={r.id} className="dossier-row">
                      <span className="stamp">{t.label}</span>
                      {r.href ? (
                        <h3 className="dossier-row__title"><a href={r.href}>{r.title}</a></h3>
                      ) : (
                        <h3 className="dossier-row__title">{r.title}</h3>
                      )}
                      <p className="dossier-row__meta">{r.meta} · {r.disciplines.map(catLabel).join(", ")}</p>
                      <p className="dossier-row__summary">{r.summary}</p>
                      {r.project && (
                        <details className="dossier-row__more">
                          <summary>Read the project file</summary>
                          <p>{r.project.overview}</p>
                          <p><strong>Objective.</strong> {r.project.objective}</p>
                          <p><strong>Methods.</strong> {r.project.methods.join("; ")}</p>
                          {r.project.role && <p><strong>Role.</strong> {r.project.role}</p>}
                          {r.project.findings?.length > 0 && <p><strong>Documented findings.</strong> {r.project.findings.join("; ")}</p>}
                        </details>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="drawer__empty">
                  {none
                    ? t.id === "case" ? "Dossiers in preparation. Each will be a genuine, publicly documented case written from cited sources." : "No academic projects published yet — they appear once their details are verified."
                    : "No records match these filters."}
                </p>
              )}
            </section>
          );
        })}

        <section id="standard" className="block" aria-labelledby="standard-title">
          <h2 id="standard-title" className="block__title">Editorial standard</h2>
          <ol className="ladder">
            <li><strong>Observation</strong> — what a source records as seen, measured or tested.</li>
            <li><strong>Interpretation</strong> — what was inferred, and by whom.</li>
            <li><strong>Conclusion</strong> — the outcome as formally reached, and nothing more.</li>
          </ol>
          <div className="cols">
            <ul className="ticks">
              <li>Primary sources first: judgments, official reports, peer-reviewed papers.</li>
              <li>Publisher, year, link and access date for every reference.</li>
              <li>Methods described only as the sources describe them.</li>
            </ul>
            <ul className="ticks">
              <li>No graphic imagery — original diagrams instead.</li>
              <li>No active cases, private case files or confidential material.</li>
              <li>Victim details limited to what is necessary and responsibly public; licensed images only.</li>
            </ul>
          </div>
        </section>

        <section id="sources" className="block" aria-labelledby="sources-title">
          <h2 id="sources-title" className="block__title">Sources</h2>
          <p className="block__note">Each published case study lists its own numbered references on its dossier page.</p>
          <h3 className="block__sub">Background reading</h3>
          <ol className="refs">
            {backgroundReading.map((r) => (
              <li key={r.id}>
                <cite>{r.title}</cite>. {r.publisher}, {r.year}.{" "}
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  View source<span className="visually-hidden">: {r.title} (opens in a new tab)</span> <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
          <p className="block__note">General public guidance — not sources for claims about Sujal's work.</p>
        </section>

        <section id="record" className="block" aria-labelledby="record-title">
          <h2 id="record-title" className="block__title">Academic record</h2>
          <div className="record-row">
            <GraduationCap size={20} aria-hidden="true" />
            <div>
              <p className="record-row__title">{profile.programme}</p>
              <p className="record-row__meta">{profile.institution} ({profile.institutionShort}), {profile.country} · {profile.yearOfStudy} · expected graduation {profile.expectedGraduation}</p>
            </div>
          </div>
          <p className="block__note">Certifications, awards and activities are added only once documented. None are published yet.</p>
        </section>
      </div>
    </main>
  );
}
