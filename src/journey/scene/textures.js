// Procedural canvas textures — original artwork generated at runtime (no external images).
import * as THREE from "three";
import { mulberry32, ridgePaths } from "../../lib/ridge.js";

const FONT_MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
const FONT_SERIF = '"Instrument Serif", Georgia, serif';

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
function finish(c, { repeat, anisotropy = 4, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function noise(ctx, w, h, seed, base, amp, blotches = 40) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * amp;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < blotches; i++) {
    const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.04 + rnd() * 0.06;
    g.addColorStop(0, rnd() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.5})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function concrete(seed = 1, repeat = [4, 4]) {
  const [c, ctx] = canvas(512, 512);
  noise(ctx, 512, 512, seed, "#2a2726", 26, 60);
  return finish(c, { repeat });
}

export function steel() {
  const [c, ctx] = canvas(512, 256);
  noise(ctx, 512, 256, 7, "#1d1c1c", 14, 10);
  const rnd = mulberry32(11);
  for (let i = 0; i < 400; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${rnd() * 0.035})`;
    const y = rnd() * 256;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y + (rnd() - 0.5) * 4); ctx.stroke();
  }
  return finish(c);
}

/** A typed document page: title + ruled, typewritten-style lines (abstract, no real content). */
export function documentPage({ seed = 3, title = "SCENE NOTES", tag = "ILLUSTRATIVE", lines = 18, tint = "#e9e3d6" } = {}) {
  const [c, ctx] = canvas(512, 680);
  noise(ctx, 512, 680, seed, tint, 10, 14);
  const rnd = mulberry32(seed * 13);
  ctx.fillStyle = "#1c1a18";
  ctx.font = `600 22px ${FONT_MONO}`;
  ctx.fillText(title, 40, 64);
  ctx.font = `14px ${FONT_MONO}`;
  ctx.fillStyle = "#8a1d22";
  ctx.fillText(tag, 40, 92);
  ctx.strokeStyle = "rgba(28,26,24,.25)";
  ctx.beginPath(); ctx.moveTo(40, 108); ctx.lineTo(472, 108); ctx.stroke();
  for (let i = 0; i < lines; i++) {
    const y = 140 + i * 28;
    let x = 40;
    while (x < 440) {
      const w = 12 + rnd() * 54;
      ctx.fillStyle = `rgba(28,26,24,${0.55 + rnd() * 0.3})`;
      ctx.fillRect(x, y, Math.min(w, 472 - x), 7);
      x += w + 8;
      if (rnd() < 0.08) break;
    }
  }
  return finish(c);
}

/** Ten-print style card with a generated ridge pattern (illustrative). */
export function fingerprintCard() {
  const [c, ctx] = canvas(768, 540);
  noise(ctx, 768, 540, 21, "#ebe6da", 9, 8);
  ctx.strokeStyle = "rgba(28,26,24,.55)"; ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 720, 492);
  ctx.fillStyle = "#1c1a18"; ctx.font = `600 22px ${FONT_MONO}`;
  ctx.fillText("RIDGE CARD", 48, 66);
  ctx.font = `15px ${FONT_MONO}`; ctx.fillStyle = "#8a1d22";
  ctx.fillText("GENERATED PATTERN · NOT A REAL PRINT", 48, 94);
  ctx.strokeStyle = "rgba(28,26,24,.3)"; ctx.lineWidth = 1.5;
  ctx.strokeRect(470, 120, 250, 360);
  ctx.save();
  ctx.translate(470 + 125 - 260 * 0.42, 120 + 180 - 300 * 0.5);
  ctx.scale(0.42, 0.5);
  ctx.strokeStyle = "rgba(20,18,17,.82)"; ctx.lineWidth = 4.2; ctx.lineCap = "round";
  for (const d of ridgePaths({ count: 26, step: 0.06 })) ctx.stroke(new Path2D(d));
  ctx.restore();
  ctx.fillStyle = "rgba(28,26,24,.6)";
  for (let i = 0; i < 9; i++) ctx.fillRect(48, 140 + i * 34, 120 + ((i * 53) % 230), 6);
  return finish(c, { anisotropy: 8 });
}

export function markerTent(n) {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = "#d8cfb8"; ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#151313"; ctx.font = `700 150px ${FONT_MONO}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(n), 128, 140);
  return finish(c);
}

export function scaleRuler() {
  const [c, ctx] = canvas(1024, 128);
  ctx.fillStyle = "#e8e2d4"; ctx.fillRect(0, 0, 1024, 128);
  for (let i = 0; i <= 100; i++) {
    const x = 12 + i * 10;
    const big = i % 10 === 0;
    ctx.fillStyle = big ? "#111" : "#333";
    ctx.fillRect(x, 0, big ? 3 : 1.5, big ? 54 : i % 5 === 0 ? 38 : 24);
    if (big && i < 100) { ctx.font = `20px ${FONT_MONO}`; ctx.fillText(String(i / 10), x + 6, 84); }
  }
  ctx.fillStyle = "#8a1d22"; ctx.fillRect(0, 112, 1024, 16);
  return finish(c);
}

/** Pinned board notes: index cards, a site sketch, a timeline strip. Abstract and non-graphic. */
export function boardNote(kind, seed = 5) {
  const [c, ctx] = canvas(512, 384);
  noise(ctx, 512, 384, seed, kind === "sketch" ? "#dcd6c8" : "#e4ded0", 10, 8);
  const rnd = mulberry32(seed);
  ctx.strokeStyle = "#1c1a18"; ctx.fillStyle = "#1c1a18"; ctx.lineWidth = 3;
  if (kind === "sketch") {
    ctx.strokeRect(60, 60, 390, 260);
    ctx.strokeRect(60, 60, 140, 110);
    ctx.beginPath(); ctx.arc(200, 320, 60, Math.PI, Math.PI * 1.5); ctx.stroke();
    ctx.fillStyle = "#8a1d22";
    [[260, 150], [330, 230], [390, 120]].forEach(([x, y], i) => {
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 14, y + 8); ctx.lineTo(x - 14, y + 8); ctx.fill();
      ctx.font = `16px ${FONT_MONO}`; ctx.fillText(String(i + 1), x + 18, y + 6);
    });
  } else if (kind === "timeline") {
    ctx.beginPath(); ctx.moveTo(40, 200); ctx.lineTo(472, 200); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 76;
      ctx.beginPath(); ctx.arc(x, 200, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 24, 230 + (i % 2) * 40, 48 + rnd() * 20, 6);
    }
    ctx.font = `600 20px ${FONT_MONO}`; ctx.fillText("TIMELINE", 40, 70);
  } else {
    ctx.font = `600 22px ${FONT_MONO}`; ctx.fillText(kind === "card" ? "NOTE" : "QUESTIONS", 36, 62);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      let x = 36; ctx.moveTo(x, 110 + i * 32);
      while (x < 440) { x += 14; ctx.lineTo(x, 110 + i * 32 + (rnd() - 0.5) * 8); }
      ctx.lineWidth = 2; ctx.stroke();
    }
  }
  return finish(c);
}

/** Fictional mobile-forensics viewer shown on the lab device. */
export function phoneScreen(selected = 0) {
  const [c, ctx] = canvas(360, 720);
  ctx.fillStyle = "#03111c"; ctx.fillRect(0, 0, 360, 720);
  ctx.fillStyle = "#46d8e8"; ctx.font = `600 18px ${FONT_MONO}`;
  ctx.fillText("TIMELINE VIEW", 24, 56);
  ctx.fillStyle = "#ffd27a"; ctx.font = `13px ${FONT_MONO}`;
  ctx.fillText("FICTIONAL DATA · DEMO", 24, 82);
  for (let i = 0; i < 6; i++) {
    const y = 120 + i * 92;
    const on = i === selected;
    ctx.fillStyle = on ? "rgba(70,216,232,.18)" : "rgba(70,216,232,.05)";
    ctx.fillRect(16, y, 328, 76);
    ctx.fillStyle = on ? "#46d8e8" : "rgba(70,216,232,.5)";
    ctx.fillRect(16, y, 4, 76);
    ctx.font = `14px ${FONT_MONO}`; ctx.fillText(`EVENT ${String(i + 1).padStart(2, "0")}`, 34, y + 30);
    ctx.fillStyle = "rgba(215,238,243,.6)"; ctx.fillRect(34, y + 46, 120 + ((i * 47) % 140), 6);
  }
  return finish(c);
}

export function folderLabel(text, sub) {
  const [c, ctx] = canvas(512, 160);
  noise(ctx, 512, 160, 9, "#cfc6b3", 10, 6);
  ctx.fillStyle = "#1c1a18"; ctx.font = `600 34px ${FONT_SERIF}`;
  ctx.fillText(text, 26, 70);
  ctx.fillStyle = "#8a1d22"; ctx.font = `16px ${FONT_MONO}`;
  ctx.fillText(sub, 28, 118);
  return finish(c);
}

/** Ruled archive paper. */
export function ruledPaper() {
  const [c, ctx] = canvas(512, 700);
  noise(ctx, 512, 700, 31, "#e6e0d3", 9, 10);
  ctx.strokeStyle = "rgba(40,60,90,.18)"; ctx.lineWidth = 1.5;
  for (let y = 120; y < 690; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  ctx.strokeStyle = "rgba(160,40,44,.45)";
  ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, 700); ctx.stroke();
  return finish(c);
}

/** Soft radial sprite (dust, glows). */
export function radialSprite() {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return finish(c, { srgb: false });
}

/** Greedy word wrap; the last allowed line is truncated with an ellipsis if text remains. */
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  let i = 0;
  for (; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(test).width <= maxWidth || !line) { line = test; continue; }
    lines.push(line);
    line = words[i];
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines) { lines.push(line); return lines; }
  let last = lines[maxLines - 1];
  while (ctx.measureText(last + "…").width > maxWidth && last.includes(" ")) last = last.replace(/\s+\S*$/, "");
  lines[maxLines - 1] = last + "…";
  return lines;
}

/** One archive evidence plate (3D label). The DOM list carries the same text for accessibility. */
export function archivePlate({ code, type, title, status, sealed }) {
  const [c, ctx] = canvas(640, 380);
  const g = ctx.createLinearGradient(0, 0, 0, 380);
  g.addColorStop(0, sealed ? "rgba(26,22,14,0.92)" : "rgba(4,22,38,0.9)");
  g.addColorStop(1, sealed ? "rgba(14,12,9,0.92)" : "rgba(2,10,20,0.92)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 380);
  ctx.strokeStyle = sealed ? "rgba(255,210,122,0.55)" : "rgba(70,216,232,0.55)"; ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 637, 377);
  // corner ticks
  ctx.fillStyle = sealed ? "#ffd27a" : "#46d8e8";
  [[0, 0], [620, 0], [0, 360], [620, 360]].forEach(([x, y]) => ctx.fillRect(x, y, 20, 20));
  ctx.font = `500 22px ${FONT_MONO}`; ctx.fillStyle = sealed ? "#ffd27a" : "#46d8e8";
  ctx.fillText(code, 36, 58);
  ctx.fillStyle = "rgba(215,238,243,0.62)"; ctx.textAlign = "right";
  ctx.fillText(type.toUpperCase(), 604, 58); ctx.textAlign = "left";
  ctx.font = `400 50px ${FONT_SERIF}`; ctx.fillStyle = "#eef6f8";
  wrapLines(ctx, title, 568, 3).forEach((l, i) => ctx.fillText(l, 36, 132 + i * 54));
  ctx.font = `500 20px ${FONT_MONO}`;
  const label = status.toUpperCase();
  const w = ctx.measureText(label).width + 28;
  ctx.strokeStyle = sealed ? "rgba(255,210,122,0.8)" : "rgba(70,216,232,0.8)"; ctx.lineWidth = 2;
  ctx.strokeRect(36, 316, w, 38);
  ctx.fillStyle = sealed ? "#ffd27a" : "#9feaf3"; ctx.fillText(label, 50, 342);
  if (sealed) { ctx.fillStyle = "rgba(255,210,122,0.85)"; ctx.textAlign = "right"; ctx.fillText("SEALED", 604, 342); ctx.textAlign = "left"; }
  return finish(c, { anisotropy: 8 });
}

/** Sealed evidence bag: clear polythene with a printed label block and a red tamper-evident strip. */
export function evidenceBag() {
  const [c, ctx] = canvas(512, 640);
  ctx.clearRect(0, 0, 512, 640);
  ctx.fillStyle = "rgba(225,232,236,0.16)"; ctx.fillRect(0, 0, 512, 640);
  ctx.fillStyle = "rgba(143,29,36,0.9)"; ctx.fillRect(0, 26, 512, 46);
  ctx.fillStyle = "#f3e9e6"; ctx.font = `600 22px ${FONT_MONO}`;
  ctx.fillText("EVIDENCE · SEALED", 26, 57);
  ctx.fillStyle = "rgba(236,231,221,0.94)"; ctx.fillRect(40, 110, 432, 250);
  ctx.fillStyle = "#1c1a18"; ctx.font = `600 18px ${FONT_MONO}`;
  ctx.fillText("ITEM  ·  PROP", 60, 148);
  ctx.strokeStyle = "rgba(28,26,24,.35)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(60, 190 + i * 30); ctx.lineTo(452, 190 + i * 30); ctx.stroke(); }
  ctx.fillStyle = "#8a1d22"; ctx.font = `14px ${FONT_MONO}`;
  ctx.fillText("ILLUSTRATIVE · NO REAL ITEM", 60, 346);
  // creases
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 3;
  [[30, 420, 480, 470], [10, 560, 500, 520], [200, 380, 260, 640]].forEach(([a, b, d, e]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(d, e); ctx.stroke(); });
  return finish(c);
}

/** Side label of an archive storage box. */
export function boxLabel(seed = 1) {
  const [c, ctx] = canvas(256, 160);
  noise(ctx, 256, 160, seed, "#5a4a3a", 18, 6);
  ctx.fillStyle = "rgba(233,227,214,0.92)"; ctx.fillRect(70, 34, 116, 64);
  ctx.fillStyle = "#1c1a18"; ctx.font = `600 20px ${FONT_MONO}`; ctx.textAlign = "center";
  ctx.fillText(`B-${String(seed * 37 % 900 + 100)}`, 128, 62);
  ctx.fillStyle = "rgba(28,26,24,.6)"; ctx.fillRect(88, 76, 80, 5);
  return finish(c);
}

/** Light falling through window blinds (used additively on the floor and wall). Linear, not sRGB. */
export function blindsLight() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9; i++) {
    const y = 18 + i * 25;
    const g = ctx.createLinearGradient(0, y, 0, y + 14);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, y, 256, 14);
  }
  // soft edges so the pattern has no hard frame
  const v = ctx.createRadialGradient(128, 128, 40, 128, 128, 136);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, 256, 256);
  return finish(c, { srgb: false });
}

// ---------------------------------------------------------------- Profile wall (3D room)
// Text is drawn large (≈1000–1500 px per metre) so it stays crisp in the camera close-up.

const FONT_SANS = '"IBM Plex Sans", system-ui, sans-serif';

/** Text with letter spacing (canvas letterSpacing is not available everywhere). */
function spaced(ctx, text, x, y, spacing, align = "left") {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign; ctx.textAlign = "left";
  [...text].forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i] + spacing; });
  ctx.textAlign = prev;
  return total;
}

/** Word-wrapped lines within maxWidth (no truncation). */
function wrap(ctx, text, maxWidth) {
  const out = [];
  let line = "";
  for (const w of text.split(" ")) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}

/** Name lettering applied directly to the wall panel (transparent background). 1500 × 800 = 1.5 × 0.8 m. */
export function wallName({ name, discipline }) {
  const [c, ctx] = canvas(1500, 800);
  ctx.clearRect(0, 0, 1500, 800);
  ctx.fillStyle = "#efe8dc";
  ctx.font = `400 300px ${FONT_SERIF}`;
  ctx.textBaseline = "alphabetic";
  spaced(ctx, name[0], 20, 270, 10);
  spaced(ctx, name[1], 20, 545, 10);
  ctx.fillStyle = "#c8443f";
  ctx.fillRect(24, 618, 90, 6);
  ctx.fillStyle = "#d9d1c4";
  ctx.font = `500 62px ${FONT_MONO}`;
  spaced(ctx, discipline, 140, 645, 18);
  return finish(c, { anisotropy: 8 });
}

/** Engraved brushed-metal information plate. 1360 × 400 = 1.36 × 0.4 m. */
export function wallPlate(lines) {
  const [c, ctx] = canvas(1360, 400);
  noise(ctx, 1360, 400, 41, "#a59f95", 12, 4);
  const rnd = mulberry32(5);
  for (let i = 0; i < 900; i++) { // brushing
    ctx.strokeStyle = `rgba(255,255,255,${rnd() * 0.05})`;
    const y = rnd() * 400;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1360, y + (rnd() - 0.5) * 2); ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, "rgba(255,255,255,0.12)"); g.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1360, 400);
  ctx.strokeStyle = "rgba(20,18,16,0.55)"; ctx.lineWidth = 4; ctx.strokeRect(14, 14, 1332, 372);
  // engraved text: dark fill with a light lower edge
  const engrave = (text, y, font) => {
    ctx.font = font;
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillText(text, 62, y + 2);
    ctx.fillStyle = "#0e0d0b"; ctx.fillText(text, 60, y);
  };
  engrave(lines[0], 128, `600 72px ${FONT_SANS}`);
  engrave(lines[1], 226, `400 60px ${FONT_SANS}`);
  engrave(lines[2], 318, `500 46px ${FONT_MONO}`);
  ctx.fillStyle = "#1b1916";
  for (const [x, y] of [[36, 36], [1324, 36], [36, 364], [1324, 364]]) { ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); }
  return finish(c, { anisotropy: 8 });
}

/**
 * A pinned paper card with an evidence-style tag. 1260 × 840 = 0.84 × 0.56 m.
 * Returns the texture and the vertical band (0..1 from the top) of each item, for click regions.
 */
export function wallCard({ tag, heading, items, sub }) {
  const W = 1260, H = 840;
  const [c, ctx] = canvas(W, H);
  noise(ctx, W, H, tag.length * 7 + heading.length, "#e6e0d3", 9, 10);
  ctx.strokeStyle = "rgba(28,26,24,.18)"; ctx.lineWidth = 2; ctx.strokeRect(10, 10, W - 20, H - 20);
  // evidence-style tag
  ctx.fillStyle = "#a3242c"; ctx.fillRect(56, 54, 132, 70);
  ctx.fillStyle = "#f6efe9"; ctx.font = `600 40px ${FONT_MONO}`; ctx.textAlign = "center";
  ctx.fillText(tag, 122, 102); ctx.textAlign = "left";
  ctx.fillStyle = "#1c1a18"; ctx.font = `600 50px ${FONT_MONO}`;
  spaced(ctx, heading, 214, 106, 7);
  ctx.fillStyle = "rgba(28,26,24,.3)"; ctx.fillRect(56, 156, W - 112, 3);
  const bands = [];
  let y = 236;
  if (sub) { // leadership: a large name and a role line
    ctx.fillStyle = "#1c1a18"; ctx.font = `400 150px ${FONT_SERIF}`;
    spaced(ctx, sub.name, 60, y + 120, 12);
    ctx.fillStyle = "#8a1d22"; ctx.font = `600 66px ${FONT_SANS}`;
    ctx.fillText(sub.role, 64, y + 250);
    bands.push([0.25, 0.75]);
  }
  ctx.font = `500 56px ${FONT_SANS}`;
  for (const item of items) {
    const lines = wrap(ctx, item, W - 200);
    const top = y;
    ctx.fillStyle = "#a3242c"; ctx.fillRect(64, y - 26, 16, 16);
    ctx.fillStyle = "#1c1a18";
    lines.forEach((l, i) => ctx.fillText(l, 108, y + i * 68));
    y += lines.length * 68 + 36;
    bands.push([(top - 60) / H, (y - 40) / H]);
  }
  return { texture: finish(c, { anisotropy: 8 }), bands };
}

/** Small brass caption plate. 840 × 140 = 0.42 × 0.07 m. */
export function brassLabel(text) {
  const [c, ctx] = canvas(840, 140);
  const g = ctx.createLinearGradient(0, 0, 0, 140);
  g.addColorStop(0, "#b39a63"); g.addColorStop(0.5, "#8f7745"); g.addColorStop(1, "#6f5a31");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 840, 140);
  ctx.fillStyle = "#231c10"; ctx.font = `500 44px ${FONT_MONO}`; ctx.textAlign = "center";
  spaced(ctx, text, 420, 86, 8, "center");
  return finish(c);
}

/** Loads an SVG (or any image URL) into a CanvasTexture at a fixed size. Resolves null on failure. */
export function imageTexture(url, w, h) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const [c, ctx] = canvas(w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(finish(c, { anisotropy: 8 }));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
