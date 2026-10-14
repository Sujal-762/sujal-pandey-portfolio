// Text for the cinematic journey (home page). Kept short on purpose — detail lives in dossier pages.
// Plain JavaScript. Interest descriptions come from site.js (confirmed).
import { interests } from "./site.js";

const interest = (id) => interests.find((i) => i.id === id);

/**
 * Evidence-table hotspots. `world` is the 3D point the button tracks; `fallback` is its position (%)
 * on the 2D poster when WebGL is unavailable or reduced motion is on. Props are illustrative.
 */
export const hotspots = [
  {
    id: "profile",
    label: "Magnifier",
    title: "Sujal Pandey",
    body: "Third-year B.Sc. Forensic Science student at Lovely Professional University, India. Expected to graduate in 2027. Aspiring crime scene investigator — a student, not a practising or certified crime scene investigator.",
    world: [-0.08, 0.95, 0.3],
    fallback: [44, 70],
  },
  {
    id: "csi",
    label: "Ridge card",
    title: interest("csi").title,
    body: interest("csi").description,
    world: [0.28, 0.93, 0.12],
    fallback: [62, 66],
  },
  {
    id: "qde",
    label: "Documents",
    title: interest("qde").title,
    body: interest("qde").description,
    world: [-0.62, 0.93, -0.04],
    fallback: [24, 64],
  },
  {
    id: "bio",
    label: "Swab tube",
    title: interest("bio").title,
    body: interest("bio").description,
    world: [0.78, 0.95, -0.18],
    fallback: [78, 58],
  },
  {
    id: "psych",
    label: "Evidence board",
    title: interest("psych").title,
    body: interest("psych").description,
    world: [0.62, 2.2, -3.1],
    fallback: [60, 24],
  },
];

export const labNotes = {
  digital: interest("digital"),
  // Fictional events for the educational device timeline — NOT data from any real device.
  events: [
    { time: "08:02", label: "Device unlocked", note: "Lock-screen events can help order activity — if the device clock is reliable." },
    { time: "08:05", label: "Wi-Fi network joined", note: "Network records may corroborate where a device was. They do not show who used it." },
    { time: "08:11", label: "Photo saved", note: "Photo metadata can include a time and sometimes a location — both can be wrong or edited." },
    { time: "08:14", label: "Message sent", note: "A message record shows that something was sent, not who was holding the phone." },
    { time: "08:20", label: "Location point", note: "A location point is an estimate with an accuracy radius, not an exact fact." },
    { time: "08:31", label: "App opened", note: "App logs differ by app and version; interpreting them depends on testing." },
  ],
};

// Lab annotation anchors (shown after an illustrative scan)
export const labAnchors = [
  { id: "centre", label: "Pattern centre", world: [0, 1.62, -23.9] },
  { id: "flow", label: "Ridge flow", world: [-0.95, 2.45, -23.9] },
];

// Camera close-up for each evidence object when it is selected (position, look-at), in metres.
const FOCUS = {
  profile: { pos: [-0.12, 1.36, 0.86], look: [-0.08, 0.92, 0.28] },
  csi: { pos: [0.36, 1.3, 0.64], look: [0.28, 0.9, 0.1] },
  qde: { pos: [-0.6, 1.38, 0.48], look: [-0.66, 0.9, -0.06] },
  bio: { pos: [0.98, 1.28, 0.36], look: [0.78, 0.92, -0.18] },
  psych: { pos: [0.42, 1.92, -1.05], look: [0.38, 1.85, -3.15] },
};
hotspots.forEach((h) => { h.focus = FOCUS[h.id]; });
