// Generates the ORIGINAL pencil-style illustrated portrait used on the 3D profile wall:
//   node scripts/draw-sketch.mjs   → src/assets/sketch/sujal-pandey-sketch.svg
// Hand-authored vector line art (not traced or derived from any photograph): a calm, stylised portrait with
// swept-back wavy hair, rectangular glasses, a gentle smile, short beard, turtleneck and suit jacket.
// It is a design element only — not a forensic facial composite and not a likeness record.
// Deterministic (seeded), so the output is stable between runs.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "src/assets/sketch/sujal-pandey-sketch.svg");

let seed = 2027;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const j = (a) => (rnd() - 0.5) * 2 * a;
const f = (n) => n.toFixed(1);
const INK = "#262422";

/** Smooth path (Catmull-Rom → cubic Bézier) through points, with optional per-point jitter. */
function curve(pts, jitter = 0, close = false) {
  const p = pts.map(([x, y]) => [x + j(jitter), y + j(jitter)]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return close ? d + " Z" : d;
}

/** A pencil line: the same curve drawn in a few light passes, like repeated graphite strokes. */
function pencil(pts, { w = 2, o = 0.75, passes = 3, jitter = 1.1 } = {}) {
  let s = "";
  for (let k = 0; k < passes; k++) {
    s += `<path d="${curve(pts, jitter)}" stroke="${INK}" stroke-width="${f(w * (0.65 + rnd() * 0.5))}" stroke-opacity="${(o * (0.55 + rnd() * 0.45)).toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return s;
}

/** Parallel hatching at an angle inside a clip region. */
function hatch(clipId, box, { angle = 50, gap = 7, w = 1.1, o = 0.3 } = {}) {
  const [x0, y0, x1, y1] = box;
  const a = (angle * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
  const half = Math.hypot(x1 - x0, y1 - y0) / 2;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let s = `<g clip-path="url(#${clipId})">`;
  for (let t = -half; t <= half; t += gap * (0.85 + rnd() * 0.3)) {
    const px = cx - dy * t, py = cy + dx * t;
    s += `<path d="M${f(px - dx * half)} ${f(py - dy * half)} L${f(px + dx * half)} ${f(py + dy * half)}" stroke="${INK}" stroke-width="${f(w * (0.7 + rnd() * 0.6))}" stroke-opacity="${(o * (0.65 + rnd() * 0.45)).toFixed(2)}" stroke-linecap="round"/>`;
  }
  return s + "</g>";
}

const W = 600, H = 760;

// ---- Shapes -------------------------------------------------------------------------------------------
const face = [[212, 252], [207, 312], [214, 372], [234, 420], [266, 452], [300, 464], [334, 452], [366, 420], [386, 372], [393, 312], [388, 252]];
// Hair: a full, wavy mass swept up and back (volume on top, close at the sides).
const hairOuter = [[208, 272], [202, 236], [204, 196], [222, 160], [246, 140], [262, 124], [290, 116], [314, 108], [340, 116], [364, 120], [386, 140], [402, 170], [408, 210], [402, 246], [392, 272]];
const hairLine = [[392, 268], [384, 240], [360, 224], [330, 222], [304, 214], [278, 220], [250, 226], [226, 244], [212, 262], [208, 272]];
const hairPath = curve([...hairOuter, ...hairLine.slice(1)], 0, true);
const neckPath = "M262 432 C262 452 260 470 258 488 L342 488 C340 470 338 452 338 432 Z";
const collarPath = "M238 470 C266 460 334 460 362 470 C366 494 368 520 370 556 L230 556 C232 520 234 494 238 470 Z";
const jacketL = "M234 536 C196 552 150 570 118 596 C92 630 82 690 80 760 L298 760 L262 660 L232 612 Z";
const jacketR = "M366 536 C404 552 450 570 482 596 C508 630 518 690 520 760 L302 760 L338 660 L368 612 Z";

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>Illustrated portrait of Sujal Pandey — original pencil-style artwork, not a photograph</title>
<defs>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.15  0 0 0 0 0.14  0 0 0 0 0.12  0 0 0 0.12 0"/>
  </filter>
  <filter id="graphite" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="3" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="1.3"/>
  </filter>
  <radialGradient id="paperShade" cx="50%" cy="40%" r="72%"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a3026" stop-opacity="0.15"/></radialGradient>
  <linearGradient id="hairTone" x1="0" y1="1" x2="0.3" y2="0"><stop offset="0" stop-color="${INK}" stop-opacity="0.62"/><stop offset="0.7" stop-color="${INK}" stop-opacity="0.42"/><stop offset="1" stop-color="${INK}" stop-opacity="0.22"/></linearGradient>
  <radialGradient id="tone" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="${INK}" stop-opacity="0"/><stop offset="1" stop-color="${INK}" stop-opacity="0.08"/></radialGradient>
  <clipPath id="face"><path d="${curve(face, 0, true)}"/></clipPath>
  <clipPath id="cheek"><path d="M338 250 L396 250 L392 380 L366 424 L336 452 C356 400 360 330 338 250 Z"/></clipPath>
  <clipPath id="hair"><path d="${hairPath}"/></clipPath>
  <clipPath id="neck"><path d="${neckPath}"/></clipPath>
  <clipPath id="collar"><path d="${collarPath}"/></clipPath>
  <clipPath id="jl"><path d="${jacketL}"/></clipPath>
  <clipPath id="jr"><path d="${jacketR}"/></clipPath>
  <clipPath id="vee"><path d="M262 660 L298 752 L302 752 L338 660 L368 556 L232 556 Z"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="#ece7dc"/>
<rect width="${W}" height="${H}" filter="url(#grain)"/>
<rect width="${W}" height="${H}" fill="url(#paperShade)"/>
<g filter="url(#graphite)">`;

// ---- Jacket (light, open, notch lapels) -----------------------------------------------------------------
svg += hatch("jl", [80, 552, 300, 760], { angle: 64, gap: 7, o: 0.26 });
svg += hatch("jr", [300, 552, 520, 760], { angle: 64, gap: 6, o: 0.34 });
svg += hatch("jr", [300, 552, 520, 760], { angle: -26, gap: 11, o: 0.14 });
svg += pencil([[234, 536], [180, 558], [120, 596], [94, 640], [80, 760]], { w: 2.4, o: 0.8 });
svg += pencil([[366, 536], [420, 558], [480, 596], [506, 640], [520, 760]], { w: 2.4, o: 0.8 });
// Lapels: from the collar, a notch, then down to the button point
svg += pencil([[236, 540], [222, 590], [236, 600], [232, 612], [262, 660], [298, 752]], { w: 2.2, o: 0.85 });
svg += pencil([[364, 540], [378, 590], [364, 600], [368, 612], [338, 660], [302, 752]], { w: 2.2, o: 0.85 });
svg += pencil([[222, 590], [204, 640]], { w: 1.2, o: 0.4, passes: 2 });
svg += pencil([[378, 590], [396, 640]], { w: 1.2, o: 0.4, passes: 2 });

// ---- Turtleneck (dark, ribbed) + fine chain ---------------------------------------------------------------
svg += `<path d="${collarPath}" fill="${INK}" fill-opacity="0.38"/>`;
svg += hatch("collar", [230, 460, 370, 760], { angle: 86, gap: 3.2, w: 1.4, o: 0.6 });
svg += hatch("collar", [236, 470, 364, 760], { angle: 14, gap: 9, o: 0.2 });
svg += pencil([[238, 470], [234, 510], [230, 556]], { w: 2, o: 0.8 });
svg += pencil([[362, 470], [366, 510], [370, 556]], { w: 2, o: 0.8 });
svg += pencil([[238, 470], [300, 462], [362, 470]], { w: 1.8, o: 0.7 });
svg += pencil([[240, 494], [300, 502], [360, 494]], { w: 1.2, o: 0.4, passes: 2 });
// below the collar the jacket's V shows the turtleneck body
svg += `<path d="M262 660 L298 752 L302 752 L338 660 L368 556 L232 556 Z" fill="${INK}" fill-opacity="0.16"/>`;
svg += hatch("vee", [232, 556, 368, 752], { angle: 84, gap: 3.4, w: 1.3, o: 0.5 });
svg += hatch("vee", [232, 556, 368, 752], { angle: 20, gap: 10, o: 0.18 });

// ---- Neck + ears ------------------------------------------------------------------------------------------
svg += hatch("neck", [258, 432, 342, 490], { angle: 60, gap: 6, o: 0.2 });
svg += pencil([[264, 440], [261, 480]], { w: 1.8, o: 0.7 });
svg += pencil([[336, 440], [339, 480]], { w: 1.8, o: 0.7 });
svg += pencil([[210, 298], [196, 292], [190, 318], [196, 348], [214, 360]], { w: 1.8, o: 0.75 });
svg += pencil([[390, 298], [404, 292], [410, 318], [404, 348], [386, 360]], { w: 1.8, o: 0.75 });
svg += pencil([[201, 310], [199, 328], [206, 342]], { w: 1.1, o: 0.4, passes: 2 });
svg += pencil([[399, 310], [401, 328], [394, 342]], { w: 1.1, o: 0.4, passes: 2 });

// ---- Face: gentle tone, cheek shading, outline ------------------------------------------------------------
svg += `<path d="${curve(face, 0, true)}" fill="url(#tone)"/>`;
svg += hatch("cheek", [330, 240, 400, 460], { angle: 58, gap: 7, o: 0.16 });
svg += pencil(face.slice(0, 6), { w: 2, o: 0.8 });
svg += pencil(face.slice(5), { w: 2, o: 0.8 });

// ---- Hair: dense flowing strokes clipped to the hair mass ---------------------------------------------------------
svg += `<path d="${hairPath}" fill="url(#hairTone)"/>`;
let hairStrokes = "";
for (let i = 0; i < 120; i++) {
  const t = rnd();
  const x0 = 210 + t * 182, y0 = 262 - Math.sin(t * Math.PI) * 44 + j(6);
  const back = (t - 0.42) * 46;
  hairStrokes += pencil([[x0, y0], [x0 + back * 0.4, y0 - 50], [x0 + back * 0.9 - 8, y0 - 100], [x0 + back * 1.3 - 18, y0 - 160]], { w: 1.6, o: 0.7, passes: 1, jitter: 3 });
}
svg += `<g clip-path="url(#hair)">${hairStrokes}</g>`;
// A few locks that break the outline, and a loose forelock toward the forehead
hairStrokes = "";
for (const [x, y, dx] of [[248, 142, -14], [292, 116, -10], [338, 114, 8], [380, 138, 12], [222, 176, -10]]) {
  hairStrokes += pencil([[x, y + 14], [x + dx * 0.5, y - 2], [x + dx, y - 8]], { w: 2, o: 0.65, passes: 2, jitter: 1.5 });
}
hairStrokes += pencil([[300, 216], [312, 230], [326, 236], [334, 232]], { w: 2, o: 0.6, passes: 2 }); // forelock
hairStrokes += pencil([[312, 214], [326, 226], [340, 228]], { w: 1.6, o: 0.5, passes: 2 });
svg += hairStrokes;
svg += pencil(hairOuter, { w: 2.4, o: 0.8 });
svg += pencil(hairLine, { w: 1.8, o: 0.65 });

// ---- Eyebrows, eyes, glasses --------------------------------------------------------------------------------
svg += pencil([[228, 258], [248, 249], [270, 248], [290, 255]], { w: 4.2, o: 0.8, passes: 4 });
svg += pencil([[310, 255], [330, 248], [352, 249], [372, 258]], { w: 4.2, o: 0.8, passes: 4 });
for (const cx of [254, 346]) {
  svg += pencil([[cx - 19, 296], [cx - 6, 289], [cx + 8, 289], [cx + 19, 295]], { w: 1.9, o: 0.85 });
  svg += pencil([[cx - 15, 299], [cx, 303], [cx + 15, 299]], { w: 1.1, o: 0.45, passes: 2 });
  svg += `<circle cx="${cx + 1}" cy="295.5" r="6" fill="${INK}" fill-opacity="0.85"/><circle cx="${cx + 3}" cy="293.5" r="1.7" fill="#ece7dc"/>`;
  svg += pencil([[cx - 14, 309], [cx, 312], [cx + 14, 309]], { w: 0.9, o: 0.25, passes: 1 });
}
const lens = (x0, x1) => {
  const r = 10, y0 = 268, y1 = 320;
  return `M${x0 + r} ${y0} L${x1 - r} ${y0} Q${x1} ${y0} ${x1} ${y0 + r} L${x1} ${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} L${x0 + r} ${y1} Q${x0} ${y1} ${x0} ${y1 - r} L${x0} ${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
};
for (const [x0, x1] of [[210, 292], [308, 390]]) {
  for (let k = 0; k < 2; k++) svg += `<path d="${lens(x0 + j(0.6), x1 + j(0.6))}" fill="none" stroke="#1d1b1a" stroke-width="${f(3 + rnd() * 0.8)}" stroke-opacity="${(0.7 + rnd() * 0.25).toFixed(2)}" stroke-linejoin="round"/>`;
  svg += pencil([[x0 + 10, 276], [x0 + 24, 273]], { w: 1.2, o: 0.25, passes: 1 });
}
svg += pencil([[292, 286], [300, 281], [308, 286]], { w: 2.6, o: 0.85 });
svg += pencil([[210, 282], [198, 288]], { w: 2.6, o: 0.75 });
svg += pencil([[390, 282], [402, 288]], { w: 2.6, o: 0.75 });

// ---- Nose ---------------------------------------------------------------------------------------------------
svg += pencil([[301, 312], [297, 340], [292, 358]], { w: 1.3, o: 0.4 });
svg += pencil([[283, 362], [290, 370], [300, 372], [310, 370], [317, 362]], { w: 1.8, o: 0.75 });
svg += pencil([[288, 365], [291, 361]], { w: 2.2, o: 0.55, passes: 2 });
svg += pencil([[312, 365], [309, 361]], { w: 2.2, o: 0.55, passes: 2 });

// ---- Moustache (soft), gentle smile, short beard ---------------------------------------------------------------
svg += pencil([[270, 389], [286, 384], [300, 386], [314, 384], [330, 389]], { w: 3.2, o: 0.45, passes: 3, jitter: 0.8 });
svg += pencil([[264, 402], [282, 400], [300, 401], [318, 400], [336, 402]], { w: 2, o: 0.8 });
svg += pencil([[268, 405], [284, 418], [300, 421], [316, 418], [332, 405]], { w: 1.8, o: 0.7 });
svg += `<path d="M270 404 Q300 409 330 404 L325 410 Q300 414 275 410 Z" fill="#fbf8f1" fill-opacity="0.85"/>`;
svg += pencil([[256, 384], [258, 398], [264, 408]], { w: 1.2, o: 0.35, passes: 2 });
svg += pencil([[344, 384], [342, 398], [336, 408]], { w: 1.2, o: 0.35, passes: 2 });
// Short beard on the chin: soft vertical hatching that follows the jaw
svg += `<path d="M276 432 C284 446 292 458 300 461 C308 458 316 446 324 432 C312 438 288 438 276 432 Z" fill="${INK}" fill-opacity="0.32"/>`;
for (let i = 0; i < 40; i++) {
  const t = rnd(), x = 278 + t * 44, top = 434 + Math.abs(t - 0.5) * 6;
  svg += `<path d="M${f(x)} ${f(top + rnd() * 6)} L${f(x + j(1.5))} ${f(top + 12 + rnd() * 10 - Math.abs(t - 0.5) * 22)}" stroke="${INK}" stroke-width="1.3" stroke-opacity="${(0.4 + rnd() * 0.3).toFixed(2)}" stroke-linecap="round"/>`;
}
svg += pencil([[226, 396], [236, 426], [258, 450]], { w: 0.9, o: 0.2, passes: 2 });
svg += pencil([[374, 396], [364, 426], [342, 450]], { w: 0.9, o: 0.25, passes: 2 });

svg += `</g>
<text x="32" y="736" font-family="Georgia, serif" font-style="italic" font-size="19" fill="${INK}" fill-opacity="0.5">illustration · S.P.</text>
</svg>
`;

await mkdir(dirname(out), { recursive: true });
await writeFile(out, svg);
console.log(`Wrote ${out.replace(root, ".")} (${(svg.length / 1024).toFixed(1)} kB)`);
