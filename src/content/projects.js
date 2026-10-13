// Archive categories and PUBLISHED projects.
//
// Only add a project here once Sujal has confirmed every field. Unconfirmed work (including
// RAPID and Evidencia) stays in drafts/projects.md, which is never imported or deployed.
// `npm run check` validates every entry below.
//
// Project shape:
// {
//   slug: "unique-kebab-case",          // required
//   category: "csi" | "bio" | "qde" | "digital" | "tech",
//   title, summary, overview, objective, // required strings
//   methods: ["..."],                    // required, at least one
//   status: "Completed" | "In progress" | "Concept",
//   role?: "...", year?: "2026", tools?: ["..."],
//   gallery?: [{ src: "/projects/x.jpg", alt: "Descriptive alt text", caption?: "..." }],
//   findings?: ["Only documented findings"],
//   links?: [{ label: "Repository", url: "https://..." }],
// }

export const categories = [
  { id: "csi", label: "Crime Scene Investigation", code: "CSI" },
  { id: "bio", label: "Forensic Biology & Serology", code: "BIO" },
  { id: "qde", label: "Questioned Document Examination", code: "QDE" },
  { id: "digital", label: "Digital & Mobile Forensics", code: "DMF" },
  { id: "tech", label: "Forensic Technology", code: "TEC" },
];

export const projects = [];
