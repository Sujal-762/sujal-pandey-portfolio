// Shared vocabulary for the archive, case-study pages and SEO. Plain JavaScript.

export const DISCIPLINES = [
  { id: "csi", label: "Crime Scene Investigation" },
  { id: "bio", label: "Forensic Biology & Serology" },
  { id: "psych", label: "Forensic Psychology" },
  { id: "qde", label: "Questioned Document Examination" },
  { id: "digital", label: "Digital & Mobile Forensics" },
  { id: "tech", label: "Forensic Technology" },
];

export const disciplineLabel = (id) => DISCIPLINES.find((d) => d.id === id)?.label ?? id;

export const RECORD_TYPES = [
  {
    id: "case",
    label: "Public case study",
    plural: "Public case studies",
    definition: "A genuine, publicly documented case Sujal has studied, written from cited public sources.",
  },
  {
    id: "project",
    label: "Academic project",
    plural: "Academic projects",
    definition: "Sujal's own coursework or independent work, published once its details are verified.",
  },
  {
    id: "demo",
    label: "Interface demo",
    plural: "Interface demos",
    definition: "Fictional entries that only demonstrate how this archive works. Not real cases, not Sujal's work.",
  },
];
