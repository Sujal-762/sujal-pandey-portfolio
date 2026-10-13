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
