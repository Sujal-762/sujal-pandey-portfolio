import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { journey, setJourney, damp } from "../store.js";
import { LAB, PRINT, ARCHIVE_RANGE, atmosphere } from "../timeline.js";
import { phoneScreen, archivePlate } from "./textures.js";
import { archiveEntries } from "../../content/archive.js";
import { mulberry32 } from "../../lib/ridge.js";
import { fromScene } from "./Room.jsx";

// Floor grid drawn in a shader: fine cyan lines that fade with distance and pulse gently outward.
const gridVertex = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const gridFragment = /* glsl */ `
varying vec3 vW; uniform float uVis, uTime; uniform vec3 uCentre;
float line(float c, float w){ float d = abs(fract(c - 0.5) - 0.5) / fwidth(c); return 1.0 - min(d / w, 1.0); }
void main(){
  vec2 p = vW.xz;
  float g = max(line(p.x * 2.0, 1.0), line(p.y * 2.0, 1.0)) * 0.55 + max(line(p.x * 0.5, 1.2), line(p.y * 0.5, 1.2)) * 0.6;
  float r = length(p - uCentre.xz);
  float fade = 1.0 - smoothstep(2.0, 14.0, r);
  float pulse = exp(-pow((r - mod(uTime * 1.6, 16.0)) * 1.4, 2.0)) * 0.55;
  vec3 col = vec3(0.16, 0.72, 0.85) * (g * (0.35 + pulse)) + vec3(0.02, 0.08, 0.16) * fade * 0.25;
  gl_FragColor = vec4(col, (g * (0.5 + pulse) + 0.12) * fade * uVis);
  #include <colorspace_fragment>
}`;

// Data streams: faint motes rising in a wide shell around the print, like records being indexed.
const streamVertex = /* glsl */ `
attribute vec4 aSeed; uniform float uTime, uPR; uniform vec3 uCentre; varying float vA;
void main(){
  float a = aSeed.x * 6.2832, r = 3.2 + aSeed.y * 4.5;
  float h = mod(aSeed.z * 6.0 + uTime * (0.18 + aSeed.w * 0.25), 6.0);
  vec3 p = uCentre + vec3(sin(a) * r, h - 1.6, -abs(cos(a)) * r * 0.9 - 0.4);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPR * (1.2 + aSeed.w * 2.2) * 6.0 / max(1.0, -mv.z);
  vA = smoothstep(0.0, 1.0, h) * (1.0 - smoothstep(4.6, 6.0, h)) * (0.35 + aSeed.w * 0.65);
}`;
const streamFragment = /* glsl */ `
uniform float uVis; varying float vA;
void main(){ vec2 q = gl_PointCoord - 0.5; float a = (1.0 - smoothstep(0.1, 0.5, length(q))) * vA * uVis; if (a < 0.01) discard;
  gl_FragColor = vec4(vec3(0.3, 0.85, 0.95) * a, a); }`;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

export const PHONE = [LAB[0] + 2.35, 1.55, LAB[2] + 0.6];
export const HELIX = [PRINT[0] - 1.75, PRINT[1] - 0.05, PRINT[2] + 0.5];
const PLATE_W = 0.96, PLATE_H = 0.57;

/**
 * Desktop: a curved archive wall around the reconstructed fingerprint; columns flank the print (never behind
 * it) so every plate stays readable. Portrait: the plates orbit the print as a slow ring — only the front
 * arc faces the camera (plate backs are not drawn), and a selected entry turns to the front.
 */
export function plateLayout(n, portrait) {
  if (portrait) {
    return Array.from({ length: n }, (_, i) => ({ ring: { a0: (i / n) * Math.PI * 2, R: 2.2, y: PRINT[1] - 0.45 + (i % 2) * 0.1 } }));
  }
  const R = 3.6;
  const angles = [-66, -46, -26, 26, 46, 66];
  const rows = Math.ceil(n / angles.length);
  const rowGap = 0.8;
  const top = PRINT[1] + ((rows - 1) * rowGap) / 2;
  // Fill columns from the centre outward, so the first entries sit closest to the print.
  const order = angles.map((a, i) => i).sort((p, q) => Math.abs(angles[p]) - Math.abs(angles[q]) || angles[p] - angles[q]);
  const out = [];
  for (let i = 0; i < n; i++) {
    const col = order[Math.floor(i / rows) % angles.length];
    const row = i % rows;
    const a = (angles[col] * Math.PI) / 180;
    const pos = [PRINT[0] + Math.sin(a) * R, top - row * rowGap, PRINT[2] - Math.cos(a) * R + 0.6];
    out.push({ pos, rotY: -a, normal: [-Math.sin(a), 0, Math.cos(a)] });
  }
  return out;
}

// Shared ring rotation (portrait only)
const ring = { angle: 0 };
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function Plate({ entry, slot, index }) {
  const mesh = useRef();
  const edge = useRef();
  const tex = useMemo(() => archivePlate(entry), [entry]);
  const geo = useMemo(() => new THREE.PlaneGeometry(PLATE_W, PLATE_H), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  const s = useRef({ lift: 0, glow: 0 });
  useEffect(() => () => { tex.dispose(); geo.dispose(); edges.dispose(); }, [tex, geo, edges]);

  // Selectable only in the archive, and only while facing the visitor (portrait ring plates turn away).
  const live = () => journey.current >= ARCHIVE_RANGE[0] && journey.current <= ARCHIVE_RANGE[1] && mesh.current.material.opacity > 0.3;

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = journey.time;
    const m = journey.amp;
    const selected = journey.entry === entry.id;
    const hovered = journey.hover === entry.id;
    const inFilter = !journey.filter || journey.filter === "all" || journey.filter === entry.group;
    s.current.lift = damp(s.current.lift, selected ? 1 : hovered ? 0.35 : 0, 5, dt);
    s.current.glow = damp(s.current.glow, selected || hovered ? 1 : inFilter ? 0.45 : 0.08, 5, dt);
    const lift = s.current.lift * 0.45;
    const bob = m * 0.025 * Math.sin(t * 0.7 + index * 1.7);
    let facing = 1;
    if (slot.ring) {
      const a = slot.ring.a0 + ring.angle;
      const nx = Math.sin(a), nz = Math.cos(a);
      facing = nz; // 1 = facing the camera
      mesh.current.position.set(PRINT[0] + nx * (slot.ring.R + lift), slot.ring.y + bob + s.current.lift * 0.2, PRINT[2] + nz * (slot.ring.R + lift));
      mesh.current.rotation.set(0, a, 0);
      mesh.current.scale.setScalar(0.78 * (1 + s.current.lift * 0.22));
    } else {
      const [x, y, z] = slot.pos;
      mesh.current.position.set(x + slot.normal[0] * lift, y + bob, z + slot.normal[2] * lift);
      mesh.current.scale.setScalar(1 + s.current.lift * 0.08);
    }
    const vis = atmosphere(journey.current).labVis * THREE.MathUtils.smoothstep(facing, -0.1, 0.45);
    mesh.current.material.opacity = vis * (inFilter || selected ? 1 : 0.22);
    edge.current.material.opacity = vis * s.current.glow;
  });

  return (
    <mesh
      ref={mesh}
      geometry={geo}
      position={slot.pos ?? PRINT}
      rotation={[0, slot.rotY ?? 0, 0]}
      onPointerOver={(e) => { if (!live() || !fromScene(e)) return; e.stopPropagation(); setJourney({ hover: entry.id }); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { if (journey.hover === entry.id) setJourney({ hover: null }); document.body.style.cursor = ""; }}
      onClick={(e) => { if (!live() || !fromScene(e)) return; e.stopPropagation(); setJourney({ entry: journey.entry === entry.id ? null : entry.id }); }}
    >
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      <lineSegments ref={edge} geometry={edges} position={[0, 0, 0.002]}>
        <lineBasicMaterial color={entry.sealed ? "#ffd27a" : "#46d8e8"} transparent toneMapped={false} />
      </lineSegments>
    </mesh>
  );
}

/** DNA double helix (two strands of points + base-pair rungs), turning slowly beside the print. */
function Helix() {
  const group = useRef();
  const { strands, rungs, mats } = useMemo(() => {
    const N = 90, H = 2.9, R = 0.26, turns = 3.2;
    const pts = [], rungPts = [];
    for (let i = 0; i < N; i++) {
      const y = (i / (N - 1) - 0.5) * H, a = (i / N) * turns * Math.PI * 2;
      const p1 = [Math.cos(a) * R, y, Math.sin(a) * R], p2 = [-p1[0], y, -p1[2]];
      pts.push(...p1, ...p2);
      if (i % 3 === 0) rungPts.push(...p1, ...p2);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rungPts, 3));
    const pm = new THREE.PointsMaterial({ color: "#7fe6f2", size: 0.035, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const lm = new THREE.LineBasicMaterial({ color: "#2f8fb0", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    return { strands: sg, rungs: rg, mats: { pm, lm } };
  }, []);
  useEffect(() => () => { strands.dispose(); rungs.dispose(); mats.pm.dispose(); mats.lm.dispose(); }, [strands, rungs, mats]);

  useFrame(() => {
    const vis = atmosphere(journey.current).labVis;
    group.current.rotation.y = journey.time * 0.35 * (0.4 + 0.6 * journey.amp);
    group.current.position.y = HELIX[1] + 0.04 * journey.amp * Math.sin(journey.time * 0.5);
    mats.pm.opacity = 0.9 * vis;
    mats.lm.opacity = 0.5 * vis * (0.8 + 0.2 * Math.sin(journey.time * 1.4));
  });

  return (
    <group ref={group} position={HELIX} rotation={[0, 0, 0.12]}>
      <points geometry={strands} material={mats.pm} />
      <lineSegments geometry={rungs} material={mats.lm} />
    </group>
  );
}

export default function ArchiveSpace({ quality }) {
  const group = useRef();
  const lights = useRef([]);
  const floorRing = useRef();
  const gyro = useRef();
  const beams = useRef();
  const screenMat = useRef();
  const lastEvent = useRef(-1);
  const { size } = useThree();
  const portrait = size.width / size.height < 0.9;

  const slots = useMemo(() => plateLayout(archiveEntries.length, portrait), [portrait]);
  // Publish plate positions so the camera rig can frame a selected entry.
  useEffect(() => {
    journey.plates = new Map(archiveEntries.map((e, i) => [e.id, slots[i]]));
  }, [slots]);

  const gridMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: gridVertex, fragmentShader: gridFragment, transparent: true, depthWrite: false,
    uniforms: { uVis: { value: 0 }, uTime: { value: 0 }, uCentre: { value: new THREE.Vector3(...LAB) } },
  }), []);

  const streams = useMemo(() => {
    const n = quality === "low" ? 260 : 600;
    const rnd = mulberry32(404);
    const seeds = new Float32Array(n * 4).map(() => rnd());
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    const m = new THREE.ShaderMaterial({
      vertexShader: streamVertex, fragmentShader: streamFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uVis: { value: 0 }, uPR: { value: 1 }, uCentre: { value: new THREE.Vector3(...PRINT) } },
    });
    return { g, m };
  }, [quality]);

  const phone = useMemo(() => {
    const body = new THREE.ExtrudeGeometry(roundedRect(0.46, 0.94, 0.06), { depth: 0.035, bevelEnabled: false });
    body.translate(0, 0, -0.035);
    const edges = new THREE.EdgesGeometry(new THREE.ShapeGeometry(roundedRect(0.46, 0.94, 0.06), 6));
    return { body, edges, screen: phoneScreen(0) };
  }, []);

  const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.02, 0.9, 6, 24, 1, true), []);
  useEffect(() => () => {
    gridMat.dispose(); phone.body.dispose(); phone.edges.dispose(); phone.screen.dispose(); beamGeo.dispose();
    streams.g.dispose(); streams.m.dispose();
  }, [gridMat, phone, beamGeo, streams]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const a = atmosphere(journey.current);
    if (group.current) group.current.visible = a.labVis > 0.002;
    if (!group.current?.visible) return;
    const t = journey.time;
    const m = journey.amp;

    // Portrait ring: drift slowly; a selected entry turns to the front (shortest way round).
    if (portrait) {
      const i = archiveEntries.findIndex((e) => e.id === journey.entry);
      if (i >= 0) ring.angle += wrapPi(-slots[i].ring.a0 - ring.angle) * (1 - Math.exp(-3 * dt));
      else ring.angle += dt * 0.07 * m;
    }

    gridMat.uniforms.uVis.value = a.labVis;
    gridMat.uniforms.uTime.value = t;
    streams.m.uniforms.uTime.value = t;
    streams.m.uniforms.uVis.value = a.labVis * 0.8;
    streams.m.uniforms.uPR.value = state.gl.getPixelRatio();
    lights.current.forEach((l, i) => l && (l.intensity = [22, 14, 9][i] * a.blue * (i === 0 ? 1 + m * 0.08 * Math.sin(t * 0.9) : 1)));
    if (floorRing.current) {
      floorRing.current.material.opacity = 0.75 * a.labVis;
      floorRing.current.rotation.z = t * 0.05;
    }
    // Scanner gyroscope around the print: two arcs on different axes, turning slowly.
    if (gyro.current) {
      const [r1, r2] = gyro.current.children;
      r1.rotation.set(1.25 + 0.1 * m * Math.sin(t * 0.3), t * 0.22, 0);
      r2.rotation.set(0.35, 0, t * -0.16);
      r1.material.opacity = 0.55 * a.labVis;
      r2.material.opacity = 0.35 * a.labVis;
    }
    if (beams.current) beams.current.children.forEach((b, i) => (b.material.opacity = a.labVis * (0.045 + m * 0.02 * Math.sin(t * 0.5 + i * 2.1))));
    // Redraw the device screen only when the selected fictional event changes.
    if (journey.labEvent !== lastEvent.current && screenMat.current) {
      lastEvent.current = journey.labEvent ?? 0;
      const next = phoneScreen(lastEvent.current);
      screenMat.current.map?.dispose();
      screenMat.current.map = next;
      screenMat.current.emissiveMap = next;
      screenMat.current.needsUpdate = true;
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh position={[LAB[0], 0.001, LAB[2]]} rotation={[-Math.PI / 2, 0, 0]} material={gridMat}>
        <planeGeometry args={[40, 40]} />
      </mesh>
      <mesh ref={floorRing} position={[PRINT[0], 0.01, PRINT[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.39, 96, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color="#46d8e8" transparent opacity={0} toneMapped={false} />
      </mesh>
      <group ref={gyro} position={PRINT}>
        <mesh>
          <torusGeometry args={[1.72, 0.006, 6, 160, Math.PI * 1.55]} />
          <meshBasicMaterial color="#46d8e8" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.86, 0.004, 6, 160, Math.PI * 1.2]} />
          <meshBasicMaterial color="#2f6bff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <group ref={beams}>
        {[[-1.6, -1.2], [1.8, -0.6], [0.2, -2.4]].map(([x, z], i) => (
          <mesh key={i} geometry={beamGeo} position={[PRINT[0] + x, 3, PRINT[2] + z]}>
            <meshBasicMaterial color="#2a7fd4" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <points geometry={streams.g} material={streams.m} frustumCulled={false} />
      <Helix />

      {archiveEntries.map((entry, i) => <Plate key={entry.id} entry={entry} slot={slots[i]} index={i} />)}

      {/* Device silhouette — a fictional, generic phone for the device-timeline demonstration */}
      <group position={PHONE} rotation={[0, -0.45, 0]}>
        <mesh geometry={phone.body}><meshStandardMaterial color="#050b12" metalness={0.8} roughness={0.25} /></mesh>
        <lineSegments geometry={phone.edges} position={[0, 0, 0.001]}><lineBasicMaterial color="#46d8e8" /></lineSegments>
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[0.41, 0.82]} />
          <meshStandardMaterial ref={screenMat} map={phone.screen} emissiveMap={phone.screen} emissive="#ffffff" emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      </group>

      <pointLight ref={(l) => (lights.current[0] = l)} position={[PRINT[0], PRINT[1], PRINT[2] + 1.2]} color="#46d8e8" distance={9} decay={2} />
      <pointLight ref={(l) => (lights.current[1] = l)} position={[PRINT[0] - 3, 2.6, PRINT[2] - 1]} color="#2f6bff" distance={10} decay={2} />
      <pointLight ref={(l) => (lights.current[2] = l)} position={[PHONE[0] - 0.4, PHONE[1], PHONE[2] + 0.8]} color="#46d8e8" distance={4} decay={2} />
    </group>
  );
}
