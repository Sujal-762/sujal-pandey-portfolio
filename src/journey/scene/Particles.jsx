import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { journey } from "../store.js";
import { CARD, PRINT, ARCHIVE_RANGE, particlePhases } from "../timeline.js";
import { mulberry32, ridgePaths } from "../../lib/ridge.js";

// One particle system carries the transformation:
// fingerprint card (physical) → crimson disintegration → cyan reconstruction at the heart of the archive.
// Every particle owns three positions; the shader blends them from the shared timeline phases.
// Once reconstructed, the print stays alive: a slow turn, breathing, shimmer and periodic scans
// (all switched off with uMotion = 0 for reduced motion).

const vertex = /* glsl */ `
attribute vec3 aStart; attribute vec3 aMid; attribute vec3 aEnd; attribute vec4 aRand;
uniform float uReveal, uScatter, uAssemble, uColour, uDim, uTime, uScan, uViewH, uMotion, uPR;
uniform vec3 uPrint;
varying vec3 vColour; varying float vAlpha; varying float vSquare;

vec3 bez2(vec3 a, vec3 b, vec3 c, float t) { float s = 1.0 - t; return s*s*a + 2.0*s*t*b + t*t*c; }
float ease(float t) { return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t + 2.0, 3.0) / 2.0; }

void main() {
  float d = aRand.x;
  float s1 = clamp(uScatter * 1.18 - d * 0.18, 0.0, 1.0);
  float s2 = clamp(uAssemble * 1.22 - d * 0.22, 0.0, 1.0);
  float k = ease(s1) * 0.52 + ease(s2) * 0.48;
  vec3 p = bez2(aStart, aMid, aEnd, k);
  float airborne = sin(3.14159 * k);
  p += uMotion * airborne * 0.16 * vec3(sin(uTime * 0.7 + aRand.w * 6.28), cos(uTime * 0.55 + aRand.w * 5.1), sin(uTime * 0.45 + aRand.w * 3.7));

  // Reconstructed print: slow turn about its vertical axis + gentle breathing (idle motion).
  float settled = smoothstep(0.92, 1.0, k);
  float spin = uMotion * settled * 0.28 * sin(uTime * 0.22);
  vec3 q = p - uPrint;
  q = vec3(q.x * cos(spin) + q.z * sin(spin), q.y, -q.x * sin(spin) + q.z * cos(spin));
  q.z += uMotion * settled * 0.035 * sin(uTime * 1.3 + aRand.w * 6.28);
  p = uPrint + q * (1.0 + uMotion * settled * 0.012 * sin(uTime * 0.6));

  // Colour: crimson → cyan
  float c = clamp(uColour * 1.25 - d * 0.25, 0.0, 1.0);
  vec3 col = mix(vec3(0.62, 0.07, 0.10), vec3(0.28, 0.86, 0.93), c);

  // Scan band (interactive and periodic)
  float band = 0.0;
  if (uScan >= 0.0) {
    float y = mix(uPrint.y + 1.45, uPrint.y - 1.45, uScan);
    band = exp(-pow((p.y - y) * 9.0, 2.0)) * settled;
    col = mix(col, vec3(0.9, 1.0, 1.0), band * 0.85);
  }
  float shimmer = 1.0 + uMotion * settled * 0.25 * sin(uTime * 2.1 + aRand.w * 40.0);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  // Size in world units: tiny on the card, larger in flight, finer once reconstructed (so ridges stay legible).
  float world = mix(0.0042, 0.021, smoothstep(0.0, 0.55, k)) * mix(1.0, 0.6, settled) * (1.0 + airborne * 0.2) * (0.6 + aRand.y * 0.8) * (1.0 + band * 1.3);
  // Capped in CSS pixels, so high-density phone screens do not get oversized fragments.
  gl_PointSize = min(uPR * 11.0, world * projectionMatrix[1][1] * uViewH * 0.5 / max(0.05, -mv.z));
  vColour = col * shimmer;
  vAlpha = uReveal * (1.0 - uDim) * (0.45 + aRand.y * 0.55);
  vSquare = step(0.86, aRand.z) * airborne;
}`;

const fragment = /* glsl */ `
varying vec3 vColour; varying float vAlpha; varying float vSquare;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float circle = 1.0 - smoothstep(0.32, 0.5, length(q));
  float square = 1.0 - smoothstep(0.42, 0.5, max(abs(q.x), abs(q.y)));
  float a = mix(circle, square, vSquare) * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColour, a);
  #include <colorspace_fragment>
}`;

/** Sample points along the generated ridge paths (pattern space ≈ 520 × 600). */
function ridgeSamples(n, rnd) {
  const pts = [];
  for (const d of ridgePaths({ count: 26, step: 0.05 })) {
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  }
  return Array.from({ length: n }, () => {
    const [x, y] = pts[Math.floor(rnd() * pts.length)];
    return [x + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 3];
  });
}

const SCAN_MS = 2400;
const AUTO_SCAN_EVERY = 8000;

export default function Particles({ count }) {
  const ref = useRef();
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const rnd = mulberry32(2027);
    const samples = ridgeSamples(count, rnd);
    const start = new Float32Array(count * 3), mid = new Float32Array(count * 3);
    const end = new Float32Array(count * 3), rand = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const [px, py] = samples[i];
      // On the card: pattern box of the card texture (see textures.fingerprintCard)
      const tx = 470 + 125 - 260 * 0.42 + px * 0.42, ty = 120 + 180 - 300 * 0.5 + py * 0.5;
      const sx = CARD[0] + (tx / 768 - 0.5) * 0.36, sz = CARD[2] + (ty / 540 - 0.5) * 0.253;
      start.set([sx, CARD[1] + 0.002, sz], i * 3);
      // Reconstructed: the same ridge point, enlarged on a vertical plane in the archive
      const ex = PRINT[0] + ((px - 260) / 600) * 2.7, ey = PRINT[1] - ((py - 300) / 600) * 2.7;
      end.set([ex, ey, PRINT[2] + (rnd() - 0.5) * 0.14], i * 3);
      // Disintegration: a loose cloud between the table and the archive, biased toward the room
      const t = 0.12 + rnd() * 0.28, r = 0.8 + rnd() * 2.2;
      const th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      mid.set([
        sx + (ex - sx) * t + r * Math.sin(ph) * Math.cos(th),
        Math.max(0.25, CARD[1] + (ey - CARD[1]) * t + r * 0.55 * Math.cos(ph) + 0.4),
        sz + (end[i * 3 + 2] - sz) * t + r * Math.sin(ph) * Math.sin(th),
      ], i * 3);
      rand.set([rnd(), rnd(), rnd(), rnd()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(end.slice(), 3)); // bounds only
    g.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    g.setAttribute("aMid", new THREE.BufferAttribute(mid, 3));
    g.setAttribute("aEnd", new THREE.BufferAttribute(end, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, -12), 40);
    return g;
  }, [count]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthTest: false, // the particles are "data" leaving the room: drawn through the dissolving walls
    fog: false,
    uniforms: {
      uReveal: { value: 0 }, uScatter: { value: 0 }, uAssemble: { value: 0 }, uColour: { value: 0 },
      uDim: { value: 0 }, uTime: { value: 0 }, uScan: { value: -1 }, uViewH: { value: 900 }, uMotion: { value: 1 }, uPR: { value: 1 },
      uPrint: { value: new THREE.Vector3(...PRINT) },
    },
  }), [gl]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    const u = journey.current;
    const ph = particlePhases(u);
    const un = material.uniforms;
    un.uReveal.value = ph.reveal; un.uScatter.value = ph.scatter; un.uAssemble.value = ph.assemble;
    un.uColour.value = ph.colour; un.uDim.value = ph.dim;
    un.uMotion.value = journey.amp;
    un.uTime.value = journey.time;
    un.uPR.value = state.gl.getPixelRatio();
    un.uViewH.value = state.size.height * state.gl.getPixelRatio();

    // Periodic scan while the visitor is in the archive (slower and rarer in calm mode).
    const now = performance.now();
    const inArchive = u >= ARCHIVE_RANGE[0] && u <= ARCHIVE_RANGE[1];
    const every = journey.reduced ? AUTO_SCAN_EVERY * 1.6 : AUTO_SCAN_EVERY;
    if (inArchive && now - journey.scanStart > every) journey.scanStart = now;
    const since = journey.scanStart > 0 ? (now - journey.scanStart) / (journey.reduced ? SCAN_MS * 1.5 : SCAN_MS) : -1;
    un.uScan.value = since >= 0 && since <= 1 ? since : -1;
    if (ref.current) ref.current.visible = ph.reveal > 0.001;
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />;
}
