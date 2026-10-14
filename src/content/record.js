// The personal record shown on the home page: About, Achievements & Recognition, Leadership (Evidencia),
// events and workshops — and the shorter text printed on the 3D profile wall.
// Every fact here was supplied and confirmed by Sujal. Do NOT add dates, scores, rankings, team details,
// attendance, guests, outcomes, roles or credentials that have not been confirmed.
// Plain JavaScript (imported by Node scripts too) — images are mapped in the components by `id`.

export const about = {
  intro:
    "Forensic science student and aspiring investigator, drawn to how evidence is recognised, documented and interpreted — and to the care it takes to turn traces into reliable findings.",
  focus:
    "Particular interests lie in crime scene investigation, where physical evidence is first found and preserved, and in digital forensics and cybercrime, where more and more of today’s evidence is digital.",
  areasOfInterest: ["Crime Scene Investigation", "Digital Forensics", "Cybercrime"],
};

export const achievements = [
  {
    id: "mobile-security-quiz",
    exhibit: "A-01",
    title: "Mobile Security Quiz Competition Winner",
    details: [
      ["Event", "National Workshop on Mobile Security Threats and Forensics"],
      ["Institution", "National Institute of Technology Jalandhar"],
      ["Association", "IIT Jammu"],
    ],
    summary:
      "Won the quiz competition held during the National Workshop on Mobile Security Threats and Forensics, organised by the National Institute of Technology Jalandhar in association with IIT Jammu.",
    image: { kind: "Achievement poster", width: 800, height: 1000,
      alt: "Lovely Professional University School of Bio Engineering and Biosciences “Student Achievement” poster featuring Sujal Pandey, announcing his win in the quiz competition at the National Workshop on Mobile Security Threats and Forensics, NIT Jalandhar, in collaboration with IIT Jammu." },
  },
  {
    id: "iff-2025",
    exhibit: "A-02",
    title: "Second Prize — International Forensic Forum 2025",
    details: [
      ["Institution", "Sharda University, Greater Noida"],
      ["Dates", "1–3 March 2025"],
    ],
    summary:
      "The LPU student cohort was recognised with second prize in Oral and Poster Presentation at the International Forensic Forum 2025.",
    // A university announcement graphic built around a GROUP PHOTOGRAPH — not a certificate.
    image: { kind: "Group photograph · LPU announcement", width: 800, height: 1000,
      alt: "Lovely Professional University School of Bio Engineering and Biosciences announcement, “Forensic Success at Sharda 2025”, built around a group photograph of the LPU student cohort and a faculty member in formal dress outside a campus building at the International Forensic Forum 2025, Sharda University, Greater Noida." },
  },
];

export const leadership = {
  id: "evidencia",
  name: "Evidencia",
  role: "Founder & CEO",
  institution: "Lovely Professional University, Punjab",
  description:
    "Evidencia is a student-run academic and technical club for B.Sc. and M.Sc. Forensic Science students at Lovely Professional University.",
  focus:
    "Its focus is forensic science learning and student engagement: giving students opportunities to explore the discipline beyond the classroom and to connect with peers across both programmes.",
  context:
    "Organised by Evidencia under the aegis of the Division of Youth Affairs, Student Welfare Wing, in collaboration with the Department of Forensic Sciences, School of Bio Engineering and Biosciences, LPU.",
};

export const events = [
  {
    id: "creative-verdict-2025",
    title: "Creative Verdict: Science for Truth and Peace",
    date: "10 November 2025",
    dateTime: "2025-11-10",
    image: { width: 1214, height: 683, alt: "Event poster for “Creative Verdict: Science for Truth and Peace”, organised by Evidencia at Lovely Professional University." },
  },
  {
    id: "unsolved-2026",
    title: "Unsolved: Truth Isn’t Lost, It’s Hidden",
    date: "7 May 2026",
    dateTime: "2026-05-07",
    image: { width: 2168, height: 1220, alt: "Event poster for “Unsolved: Truth Isn’t Lost, It’s Hidden”, organised by Evidencia at Lovely Professional University." },
  },
];

// Academic exposure. Only confirmed details; a missing date stays missing (never guessed).
export const workshops = [
  { id: "iff", title: "International Forensic Forum", where: "Sharda University, Greater Noida", date: "1–3 March 2025", related: "iff-2025" },
  { id: "nit-mobile", title: "National Workshop on Mobile Security Threats and Forensics", where: "NIT Jalandhar, in association with IIT Jammu", date: null, related: "mobile-security-quiz" },
  { id: "iscsf-2026", title: "International Symposium on Cyber Security and Forensics", code: "ISCSF-2026", where: null, date: null, related: null },
];

// Text printed on the physical profile wall in the 3D room (short by design; details live in the sections).
export const wall = {
  name: ["SUJAL", "PANDEY"],
  discipline: "FORENSIC SCIENCE",
  plate: ["B.Sc. Forensic Science", "Lovely Professional University", "Expected Graduation: 2027"],
  interests: about.areasOfInterest,
  achievements: [
    "Mobile Security Quiz Competition Winner",
    "International Forensic Forum 2025 — Second Prize recognition associated with the LPU student cohort",
  ],
  leadership: { name: "EVIDENCIA", role: "Founder & CEO" },
};
