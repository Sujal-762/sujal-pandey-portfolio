// Single source of truth for confirmed profile facts and site metadata.
// Used by the React components AND at build time (vite.config.js) for <head>, JSON-LD,
// robots.txt and sitemap.xml. Plain JavaScript only — no JSX or CSS imports.
//
// Every fact below was confirmed by Sujal. Do not add anything that has not been confirmed.

export const site = {
  // UNRESOLVED: placeholder until the real public URL is known.
  // Change only with: npm run set-domain -- https://real-url
  siteUrl: "https://sujalpandey.in",
  lastModified: "2026-10-14",
  lang: "en-IN",
  locale: "en_IN",
  title: "Sujal Pandey – Forensic Science Student & Aspiring CSI",
  description:
    "Sujal Pandey is a third-year B.Sc. Forensic Science student at Lovely Professional University (LPU), India, and an aspiring crime scene investigator.",
  ogDescription:
    "Third-year B.Sc. Forensic Science student at Lovely Professional University (LPU), India, working toward a career in crime scene investigation.",
  ogImage: "/og-image.png",
  ogImageAlt: "Sujal Pandey – Forensic Science Student, Lovely Professional University",
  themeColor: "#0a0909",
};

export const profile = {
  name: "Sujal Pandey",
  givenName: "Sujal",
  familyName: "Pandey",
  programme: "B.Sc. Forensic Science",
  institution: "Lovely Professional University",
  institutionShort: "LPU",
  institutionUrl: "https://www.lpu.in/",
  country: "India",
  yearOfStudy: "Third year",
  expectedGraduation: "2027",
  careerGoal: "Crime Scene Investigator",
};

export const contacts = {
  email: "sujalpandey02@gmail.com",
  linkedin: {
    url: "https://in.linkedin.com/in/sujal-pandey-7b3155325",
    label: "linkedin.com/in/sujal-pandey-7b3155325",
  },
  github: {
    url: "https://github.com/Sujal-762",
    label: "github.com/Sujal-762",
  },
};

// Confirmed academic interests. Descriptions summarise each field — they are not claims
// about Sujal's expertise. `category` links an interest to an archive filter (null = none).
export const interests = [
  {
    id: "csi",
    title: "Crime Scene Investigation",
    description: "Recognising, documenting, collecting and preserving physical evidence at a scene.",
    category: "csi",
  },
  {
    id: "bio",
    title: "Forensic Biology and Serology",
    description: "Identifying and examining biological material such as blood and other body fluids.",
    category: "bio",
  },
  {
    id: "psych",
    title: "Forensic Psychology",
    description: "Applying psychological knowledge to legal and investigative questions.",
    category: null,
  },
  {
    id: "qde",
    title: "Questioned Document Examination",
    description: "Examining handwriting, signatures, inks, paper and alterations in disputed documents.",
    category: "qde",
  },
  {
    id: "digital",
    title: "Digital and Mobile Forensics",
    description: "Preserving, acquiring and analysing data from computers, phones and other digital devices.",
    category: "digital",
  },
];
