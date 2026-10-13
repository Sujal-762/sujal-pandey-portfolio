// PUBLIC CASE STUDIES — genuine, publicly documented cases that Sujal has studied and can cite.
//
// THIS FILE HOLDS PUBLISHED ENTRIES ONLY. It is part of the browser bundle, so anything written here
// is public — even if filtered out of the pages. Draft case studies live in drafts/case-studies.md
// (never imported, never deployed). Move an entry here only when it is complete and verified, with
// `status: "published"`; `npm run check` rejects any other status in this file.
// Each published entry gets its own pre-rendered page at /cases/<slug>/.
//
// Ethics rules (enforced where possible by scripts/check.mjs):
//   • No active or ongoing cases (activeCase must be false).
//   • No graphic crime-scene photographs (graphicImagery must be false). Prefer original diagrams.
//   • No private case files, confidential university material, or personal details of victims beyond
//     what is necessary and already responsibly public.
//   • Every visual asset needs a verified licence/permission and source. "Visible online" is not a licence.
//   • Methods must be described as reported in the cited public sources — not invented.
//   • Keep observations, interpretations and conclusions clearly separated.
//
// Shape of one entry:
// {
//   slug: "kebab-case-unique",
//   status: "published",                       // anything else = excluded from the build
//   title: "Case name as commonly cited",
//   jurisdiction: "Country / court",           // e.g. "England and Wales"
//   period: "Year or range",                   // e.g. "1986–1988"
//   summary: "One or two sentences for the archive listing.",
//   background: ["Paragraph", "..."],          // what is publicly documented
//   questions: ["Investigation question", ...],
//   disciplines: ["csi" | "bio" | "psych" | "qde" | "digital" | "tech", ...],
//   evidenceTypes: ["e.g. Biological (DNA)", ...],
//   methods: [{ text: "Method as described in the sources", refs: [1, 2] }],
//   observations: ["What the sources report as observed facts"],
//   interpretations: ["How those observations were interpreted, and by whom"],
//   conclusions: ["What was concluded (e.g. court outcome), as reported"],
//   limitations: ["Limits of the evidence, methods or sources"],
//   lessons: ["Lesson for forensic practice"],
//   references: [{ title, publisher, year, url, accessed: "YYYY-MM-DD" }],   // at least 2
//   assets: [{ file: "/cases/slug/diagram.svg", alt, caption, credit, licence, sourceUrl }],
//   sensitivity: { activeCase: false, graphicImagery: false, victimDetailsMinimised: true },
//   verification: { verifiedBy: "Sujal Pandey", dateVerified: "YYYY-MM-DD", notes: "" },
// }

const allCaseStudies = [];

export const caseStudies = allCaseStudies.filter((c) => c.status === "published");
export { allCaseStudies };
