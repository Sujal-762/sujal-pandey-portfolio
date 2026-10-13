import { useEffect } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { caseStudies } from "../content/caseStudies.js";
import { casePath } from "../lib/routes.js";
import { disciplineLabel as dLabel } from "../content/taxonomy.js";

/** Pre-rendered dossier page for one verified public case study (/cases/<slug>/). */
export default function CaseStudyPage({ caseStudy: c }) {
  useEffect(() => { document.documentElement.dataset.world = "archive"; }, []);
  const i = caseStudies.findIndex((x) => x.slug === c.slug);
  const prev = caseStudies[i - 1];
  const next = caseStudies[i + 1];
  const refLink = (n) => <a key={n} href={`#ref-${n}`} className="cite" aria-label={`Reference ${n}`}>[{n}]</a>;

  return (
    <main id="main" tabIndex={-1} className="world world--archive dossier-page" data-world="archive">
      <article className="container dossier" aria-labelledby="case-title">
        <nav className="dossier__crumbs" aria-label="Breadcrumb">
          <a href="/#cases"><ArrowLeft size={14} aria-hidden="true" /> Archive</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Case study</span>
        </nav>

        <header className="dossier__head">
          <p className="type-stamp">Public case study</p>
          <h1 id="case-title" className="dossier__title">{c.title}</h1>
          <p className="dossier__meta">{[c.jurisdiction, c.period].filter(Boolean).join(" · ")}</p>
          <p className="dossier__summary">{c.summary}</p>
          <ul className="folder__tags" aria-label="Disciplines">
            {c.disciplines.map((d) => <li key={d}>{dLabel(d)}</li>)}
          </ul>
        </header>

        <div className="dossier__body">
          <Part n="01" title="Case background">{c.background.map((p) => <p key={p}>{p}</p>)}</Part>
          <Part n="02" title="Investigation questions"><ul>{c.questions.map((q) => <li key={q}>{q}</li>)}</ul></Part>
          <Part n="03" title="Forensic disciplines"><ul>{c.disciplines.map((d) => <li key={d}>{dLabel(d)}</li>)}</ul></Part>
          <Part n="04" title="Evidence types"><ul>{c.evidenceTypes.map((e) => <li key={e}>{e}</li>)}</ul></Part>
          <Part n="05" title="Methods described in public sources">
            <ul>{c.methods.map((m) => <li key={m.text}>{m.text} {m.refs.map(refLink)}</li>)}</ul>
          </Part>
          <Part n="06" title="Observations, interpretations and conclusions">
            <div className="dossier__ladder">
              <div><h3>Observations</h3><ul>{c.observations.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Interpretations</h3><ul>{c.interpretations.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Conclusions</h3><ul>{c.conclusions.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <h3>Limitations</h3>
            <ul>{c.limitations.map((x) => <li key={x}>{x}</li>)}</ul>
          </Part>
          <Part n="07" title="Lessons for forensic practice"><ul>{c.lessons.map((l) => <li key={l}>{l}</li>)}</ul></Part>
          <Part n="08" title="References">
            <ol className="dossier__refs">
              {c.references.map((r, k) => (
                <li key={r.url} id={`ref-${k + 1}`}>
                  <cite>{r.title}</cite>. {r.publisher}, {r.year}.{" "}
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    Source<span className="visually-hidden">: {r.title} (opens in a new tab)</span> <ArrowUpRight size={13} aria-hidden="true" />
                  </a>{" "}
                  <span className="dossier__accessed">Accessed {r.accessed}.</span>
                </li>
              ))}
            </ol>
          </Part>
          <Part n="09" title="Visual assets and licensing">
            {c.assets.length === 0 ? (
              <p>No images are used in this case study.</p>
            ) : (
              <ul className="dossier__assets">
                {c.assets.map((a) => (
                  <li key={a.file}>
                    <figure>
                      <img src={a.file} alt={a.alt} loading="lazy" decoding="async" />
                      <figcaption>{a.caption} — {a.credit}. Licence: {a.licence}.{" "}
                        <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer">Source<span className="visually-hidden"> (opens in a new tab)</span></a>
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            )}
          </Part>
          <p className="dossier__verified">
            Written by Sujal Pandey from the public sources above. Sources verified {c.verification.dateVerified}.
          </p>
        </div>

        <nav className="dossier__pager" aria-label="More case studies">
          {prev ? <a href={casePath(prev.slug)}><ArrowLeft size={15} aria-hidden="true" /> {prev.title}</a> : <span />}
          {next ? <a href={casePath(next.slug)}>{next.title} <ArrowRight size={15} aria-hidden="true" /></a> : <a href="/#cases">Back to the archive <ArrowRight size={15} aria-hidden="true" /></a>}
        </nav>
      </article>
    </main>
  );
}

function Part({ n, title, children }) {
  return (
    <section className="dossier__part" aria-labelledby={`part-${n}`}>
      <h2 id={`part-${n}`}><span aria-hidden="true">{n}</span> {title}</h2>
      {children}
    </section>
  );
}
