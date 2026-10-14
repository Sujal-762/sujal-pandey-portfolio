import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { journey, setJourney } from "../store.js";
import { CARD, TABLE_Y, EVIDENCE_RANGE, atmosphere, cardScan, smooth } from "../timeline.js";
import * as tex from "./textures.js";

/** Disposes every texture in an object when the component unmounts. */
function useDisposable(factory, deps = []) {
  const value = useMemo(factory, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => Object.values(value).forEach((t) => t?.dispose?.()), [value]);
  return value;
}

/** True when a pointer event started on the 3D scene rather than on a DOM control above it. */
export const fromScene = (e) => !e.nativeEvent?.target?.closest?.("a, button, input, select, label, [data-ui]");

/**
 * Makes an evidence object explorable: hover highlights it, click/tap selects it (camera close-up +
 * detail panel). Only active while the visitor is at the evidence table. Keyboard users get the same
 * through the Evidence index (DOM), which sets the same journey state.
 */
function Pickable({ id, children, ...props }) {
  const ref = useRef();
  const mats = useRef([]);
  useEffect(() => {
    const list = [];
    ref.current.traverse((o) => {
      if (o.isMesh && o.material && "emissive" in o.material) {
        list.push({ m: o.material, e: o.material.emissive.clone(), i: o.material.emissiveIntensity });
      }
    });
    mats.current = list;
  }, []);
  const live = () => journey.current >= EVIDENCE_RANGE[0] && journey.current <= EVIDENCE_RANGE[1];

  useFrame(() => {
    const active = live() && (journey.hover === id || journey.focus === id);
    const k = active ? 0.3 + 0.12 * journey.amp * Math.sin(journey.time * 3.2) : 0;
    for (const { m, e, i } of mats.current) {
      if (k > 0) { m.emissive.setRGB(0.6, 0.07, 0.1); m.emissiveIntensity = k; }
      else if (m.emissiveIntensity !== i) { m.emissive.copy(e); m.emissiveIntensity = i; }
    }
  });

  return (
    <group
      ref={ref}
      {...props}
      onPointerOver={(e) => {
        if (!live() || !fromScene(e)) return;
        e.stopPropagation();
        setJourney({ hover: id });
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (journey.hover === id) setJourney({ hover: null });
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        if (!live() || !fromScene(e)) return;
        e.stopPropagation();
        setJourney({ focus: journey.focus === id ? null : id });
      }}
    >
      {children}
    </group>
  );
}

function Marker({ position, rotation = 0, map }) {
  // Folded A-frame evidence marker
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.032, 0.016]} rotation={[-0.5, 0, 0]} castShadow>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={map} color="#b9b09c" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.032, -0.016]} rotation={[0.5, Math.PI, 0]} castShadow>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={map} color="#b9b09c" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Volumetric light cone under the lamp: brightest along the axis, fading toward the table and the rim.
const coneVertex = /* glsl */ `
varying float vH; varying float vFacing;
void main() {
  vH = uv.y;
  vec3 n = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFacing = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;
const coneFragment = /* glsl */ `
uniform vec3 uColour; uniform float uStrength; varying float vH; varying float vFacing;
void main() {
  float a = pow(vFacing, 2.2) * smoothstep(0.0, 0.85, vH) * (0.35 + 0.65 * vH) * uStrength;
  gl_FragColor = vec4(uColour * a, a);
}`;

// The room re-drawn as cyan edges during the transformation: a scan front sweeps outward from the card,
// so the physical space briefly becomes a measured, digital model before it dissolves.
const wireVertex = /* glsl */ `
uniform vec3 uOrigin; varying float vD;
void main() { vD = distance(position, uOrigin); gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`;
const wireFragment = /* glsl */ `
uniform float uRadius, uOpacity; varying float vD;
void main() {
  float inside = 1.0 - smoothstep(uRadius - 0.05, uRadius + 0.05, vD);
  float front = exp(-pow((vD - uRadius) * 3.0, 2.0));
  float a = (inside * 0.75 + front * 1.8) * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(vec3(0.27, 0.85, 0.93), vec3(0.85, 1.0, 1.0), front) * a, a);
}`;

/** Merges the edges of every mesh in `root` (world space) into one line geometry. */
function edgesOf(root) {
  const chunks = [];
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    if (!o.isMesh || o.userData.noWire || o.isInstancedMesh) return;
    const e = new THREE.EdgesGeometry(o.geometry, 25);
    e.applyMatrix4(o.matrixWorld);
    chunks.push(e.attributes.position.array);
    e.dispose();
  });
  root.traverse((o) => {
    if (!o.isInstancedMesh) return;
    const base = new THREE.EdgesGeometry(o.geometry, 25);
    const m = new THREE.Matrix4();
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      const e = base.clone().applyMatrix4(m).applyMatrix4(o.matrixWorld);
      chunks.push(e.attributes.position.array);
      e.dispose();
    }
    base.dispose();
  });
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(out, 3));
  return g;
}

// Storage shelving against the back wall (box positions are generated once, deterministically).
const SHELVES = [{ x: -2.75, w: 1.5 }, { x: 2.95, w: 1.3 }];
const SHELF_Y = [0.12, 0.62, 1.12, 1.62, 2.12];
function boxSlots() {
  const out = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const s of SHELVES) {
    for (const y of SHELF_Y.slice(0, 4)) {
      let x = s.x - s.w / 2 + 0.06;
      while (x < s.x + s.w / 2 - 0.4) {
        if (rnd() > 0.18) out.push([x + 0.19, y + 0.03 + 0.14, -2.86 + rnd() * 0.06, (rnd() - 0.5) * 0.08]);
        x += 0.42;
      }
    }
  }
  return out;
}

export default function Room({ quality }) {
  const group = useRef();
  const red = useRef();
  const redFill = useRef();
  const spot = useRef();
  const boardSpot = useRef();
  const bulb = useRef();
  const lamp = useRef();
  const scan = useRef();
  const spotTarget = useRef();
  const boardTarget = useRef();
  const boxes = useRef();
  const blinds = useRef();
  const wire = useRef();

  // A spotlight target must be in the scene graph so its matrix updates.
  useEffect(() => {
    if (spot.current && spotTarget.current) spot.current.target = spotTarget.current;
    if (boardSpot.current && boardTarget.current) boardSpot.current.target = boardTarget.current;
  }, []);

  const t = useDisposable(() => ({
    floor: tex.concrete(1, [5, 4]),
    wall: tex.concrete(4, [4, 2]),
    steel: tex.steel(),
    card: tex.fingerprintCard(),
    doc1: tex.documentPage({ seed: 3, title: "SCENE NOTES", tag: "ILLUSTRATIVE PROP" }),
    doc2: tex.documentPage({ seed: 8, title: "CHAIN OF CUSTODY", tag: "BLANK FORM · PROP", lines: 14 }),
    doc3: tex.documentPage({ seed: 12, title: "SKETCH LOG", tag: "ILLUSTRATIVE PROP", lines: 10, tint: "#ddd6c6" }),
    sketch: tex.boardNote("sketch", 5),
    timeline: tex.boardNote("timeline", 6),
    note1: tex.boardNote("card", 7),
    note2: tex.boardNote("questions", 9),
    ruler: tex.scaleRuler(),
    bag: tex.evidenceBag(),
    box: tex.boxLabel(3),
    blinds: tex.blindsLight(),
    m1: tex.markerTent(1), m2: tex.markerTent(2), m3: tex.markerTent(3), m4: tex.markerTent(4),
  }));

  // Red string between board pins
  const string = useMemo(() => {
    const pts = [[-0.95, 2.2], [-0.15, 1.95], [0.7, 2.25], [1.25, 1.55], [0.1, 1.35]].map(([x, y]) => new THREE.Vector3(x, y, -3.08));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: "#7a1418" });
    return { line: new THREE.Line(g, m), pins: pts };
  }, []);
  useEffect(() => () => { string.line.geometry.dispose(); string.line.material.dispose(); }, [string]);

  const slots = useMemo(boxSlots, []);
  useEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    slots.forEach(([x, y, z, r], i) => {
      q.setFromEuler(e.set(0, r, 0));
      boxes.current.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)));
    });
    boxes.current.instanceMatrix.needsUpdate = true;
  }, [slots]);

  const cone = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.05, 0.92, 1.56, 40, 1, true);
    g.translate(0, -0.78, 0);
    const m = new THREE.ShaderMaterial({
      vertexShader: coneVertex, fragmentShader: coneFragment, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColour: { value: new THREE.Color("#ffd9b0") }, uStrength: { value: 0.1 } },
    });
    return { g, m };
  }, []);

  const wireMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: wireVertex, fragmentShader: wireFragment, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uOrigin: { value: new THREE.Vector3(...CARD) }, uRadius: { value: 0 }, uOpacity: { value: 0 } },
  }), []);

  // Build the wireframe once the room's meshes exist (their world matrices are final; the lamp is excluded).
  useEffect(() => {
    const g = edgesOf(group.current);
    wire.current.geometry = g;
    return () => g.dispose();
  }, []);
  useEffect(() => () => { cone.g.dispose(); cone.m.dispose(); wireMat.dispose(); }, [cone, wireMat]);

  useFrame(() => {
    const u = journey.current;
    const a = atmosphere(u);

    // Digitisation sweep (lives outside the room group, which hides itself as the room dissolves).
    const w = smooth(2.2, 2.32, u) * (1 - smooth(2.66, 2.82, u));
    wire.current.visible = w > 0.002;
    wireMat.uniforms.uOpacity.value = w;
    wireMat.uniforms.uRadius.value = 0.2 + 9 * smooth(2.2, 2.56, u);

    if (group.current) group.current.visible = a.roomVis > 0.002;
    if (!group.current?.visible) return;
    const time = journey.time;
    const m = journey.amp; // ambient motion amplitude (calm mode keeps it small, never zero)

    // Practical lights: a faint, irregular flicker on the red light (never strobing).
    const flicker = 1 + m * (0.05 * Math.sin(time * 7.1) * Math.sin(time * 2.3) + 0.03 * Math.sin(time * 13.7));
    if (red.current) red.current.intensity = 13 * a.red * flicker;
    if (redFill.current) redFill.current.intensity = 3.5 * a.red;
    if (spot.current) spot.current.intensity = 62 * a.warm;
    if (boardSpot.current) boardSpot.current.intensity = 16 * a.warm;
    if (bulb.current) bulb.current.emissiveIntensity = 2.5 * a.warm;
    cone.m.uniforms.uStrength.value = 0.085 * a.warm * (1 + 0.15 * m * Math.sin(time * 0.8));
    if (blinds.current) blinds.current.opacity = 0.16 * a.warm * (1 + 0.12 * m * Math.sin(time * 0.33));

    // The hanging lamp sways slowly; its light pool drifts across the table like a search light.
    if (lamp.current) {
      lamp.current.rotation.z = m * 0.022 * Math.sin(time * 0.55);
      lamp.current.rotation.x = m * 0.014 * Math.sin(time * 0.41 + 1.3);
    }
    if (spotTarget.current) {
      spotTarget.current.position.x = 0.1 + m * 0.16 * Math.sin(time * 0.21);
      spotTarget.current.position.z = m * 0.1 * Math.sin(time * 0.29 + 0.6);
    }

    const s = cardScan(u);
    if (scan.current) {
      scan.current.visible = s > 0.001 && s < 0.999;
      scan.current.position.z = CARD[2] - 0.13 + s * 0.26;
    }
  });

  const wallMat = <meshStandardMaterial map={t.wall} color="#5a5350" roughness={0.95} />;
  const paper = "#a7a195"; // keeps printed paper below white under the lamp (no blown highlights)

  return (
    <>
      <lineSegments ref={wire} material={wireMat} frustumCulled={false} visible={false} />
      <group ref={group}>
        {/* Floor + walls */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow>
          <planeGeometry args={[14, 12]} />
          <meshStandardMaterial map={t.floor} color="#6b6460" roughness={0.82} metalness={0.08} />
        </mesh>
        <mesh position={[0, 2.5, -3.2]} receiveShadow><planeGeometry args={[14, 5]} />{wallMat}</mesh>
        <mesh position={[-4.2, 2.5, 0.5]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[12, 5]} />{wallMat}</mesh>
        <mesh position={[4.2, 2.5, 0.5]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[12, 5]} />{wallMat}</mesh>
        {/* Skirting line: gives the walls a readable base in the dark */}
        <mesh position={[0, 0.06, -3.18]}><boxGeometry args={[14, 0.12, 0.03]} /><meshStandardMaterial color="#141212" roughness={0.6} metalness={0.3} /></mesh>

        {/* Window with blinds (right wall) and the slatted light it throws on the floor */}
        <mesh position={[4.18, 2.05, -1.2]} rotation={[0, -Math.PI / 2, 0]} userData={{ noWire: true }}>
          <planeGeometry args={[1.5, 1.3]} />
          <meshBasicMaterial map={t.blinds} color="#7d93ad" transparent opacity={0.55} toneMapped={false} />
        </mesh>
        <mesh position={[2.75, 0.004, -0.75]} rotation={[-Math.PI / 2, 0, 0.35]} userData={{ noWire: true }}>
          <planeGeometry args={[2.6, 2.0]} />
          <meshBasicMaterial ref={blinds} map={t.blinds} color="#8ea3c0" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>

        {/* Storage shelving with archive boxes */}
        {SHELVES.map((s) => (
          <group key={s.x}>
            {SHELF_Y.map((y) => (
              <mesh key={y} position={[s.x, y, -2.85]} castShadow={quality === "high"} receiveShadow>
                <boxGeometry args={[s.w, 0.03, 0.5]} />
                <meshStandardMaterial color="#26282a" roughness={0.45} metalness={0.7} />
              </mesh>
            ))}
            {[-1, 1].flatMap((side) => [-0.22, 0.22].map((dz) => (
              <mesh key={`${side}${dz}`} position={[s.x + side * (s.w / 2 - 0.02), 1.12, -2.85 + dz]}>
                <boxGeometry args={[0.035, 2.24, 0.035]} />
                <meshStandardMaterial color="#1b1c1d" roughness={0.5} metalness={0.7} />
              </mesh>
            )))}
          </group>
        ))}
        <instancedMesh ref={boxes} args={[undefined, undefined, slots.length]} castShadow={quality === "high"} receiveShadow>
          <boxGeometry args={[0.38, 0.28, 0.4]} />
          <meshStandardMaterial map={t.box} color="#8d7c68" roughness={0.9} />
        </instancedMesh>

        {/* Evidence board (selectable: forensic psychology) */}
        <Pickable id="psych">
          <mesh position={[0.15, 1.78, -3.17]}>
            <boxGeometry args={[3.0, 1.55, 0.04]} />
            <meshStandardMaterial color="#1a1615" roughness={1} />
          </mesh>
          {[
            [t.sketch, [-0.95, 2.12], 0.62, -0.03],
            [t.timeline, [0.62, 2.18], 0.66, 0.02],
            [t.note1, [-0.2, 1.55], 0.42, 0.05],
            [t.note2, [1.22, 1.45], 0.4, -0.04],
            [t.doc3, [0.25, 1.33], 0.3, 0.02],
          ].map(([map, [x, y], w, r], i) => (
            <mesh key={i} position={[x, y, -3.14]} rotation={[0, 0, r]}>
              <planeGeometry args={[w, map === t.doc3 ? w * 1.33 : w * 0.75]} />
              <meshStandardMaterial map={map} color="#b8b2a6" roughness={0.85} />
            </mesh>
          ))}
        </Pickable>
        <primitive object={string.line} />
        {string.pins.map((p, i) => (
          <mesh key={i} position={[p.x, p.y, -3.075]}><sphereGeometry args={[0.018, 10, 10]} /><meshStandardMaterial color="#8f1d24" roughness={0.4} /></mesh>
        ))}
        {/* Picture light over the board */}
        <mesh position={[0.15, 2.72, -3.0]}><boxGeometry args={[0.9, 0.035, 0.07]} /><meshStandardMaterial color="#121111" metalness={0.7} roughness={0.35} /></mesh>
        <spotLight ref={boardSpot} position={[0.15, 2.7, -2.75]} angle={0.95} penumbra={0.9} decay={2} distance={4} color="#ffd7b5" />
        <object3D ref={boardTarget} position={[0.15, 1.6, -3.17]} />

        {/* Table */}
        <mesh position={[0, TABLE_Y - 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.06, 1.3]} />
          <meshStandardMaterial map={t.steel} color="#8a8783" roughness={0.42} metalness={0.65} />
        </mesh>
        {[[-1.1, -0.55], [1.1, -0.55], [-1.1, 0.55], [1.1, 0.55]].map(([x, z], i) => (
          <mesh key={i} position={[x, (TABLE_Y - 0.06) / 2, z]} castShadow>
            <boxGeometry args={[0.05, TABLE_Y - 0.06, 0.05]} />
            <meshStandardMaterial color="#1b1a1a" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.22, 0]}><boxGeometry args={[2.2, 0.03, 1.1]} /><meshStandardMaterial color="#181717" roughness={0.6} metalness={0.5} /></mesh>

        {/* Chair, pushed in on the far side */}
        <group position={[-0.35, 0, -0.95]} rotation={[0, 0.12, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.46, 0.04, 0.44]} /><meshStandardMaterial color="#1c1b1b" roughness={0.6} metalness={0.4} /></mesh>
          <mesh position={[0, 0.82, -0.2]} castShadow><boxGeometry args={[0.46, 0.4, 0.035]} /><meshStandardMaterial color="#1c1b1b" roughness={0.6} metalness={0.4} /></mesh>
          {[[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.25, z]}><cylinderGeometry args={[0.012, 0.012, 0.5, 8]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.35} /></mesh>
          ))}
        </group>

        {/* Ridge card (selectable: crime scene investigation) */}
        <Pickable id="csi">
          <mesh position={CARD} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[0.36, 0.253]} />
            <meshStandardMaterial map={t.card} color="#bdb7ab" roughness={0.75} />
          </mesh>
        </Pickable>
        <mesh ref={scan} position={[CARD[0], CARD[1] + 0.004, CARD[2]]} rotation={[-Math.PI / 2, 0, 0]} visible={false} userData={{ noWire: true }}>
          <planeGeometry args={[0.38, 0.006]} />
          <meshBasicMaterial color="#ff5a50" transparent opacity={0.9} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>

        {/* Documents (selectable: questioned document examination) */}
        <Pickable id="qde">
          <mesh position={[-0.56, TABLE_Y + 0.003, -0.12]} rotation={[-Math.PI / 2, 0, 0.18]} receiveShadow>
            <planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial map={t.doc1} color={paper} roughness={0.85} />
          </mesh>
          <mesh position={[-0.82, TABLE_Y + 0.005, 0.12]} rotation={[-Math.PI / 2, 0, -0.12]} receiveShadow>
            <planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial map={t.doc2} color={paper} roughness={0.85} />
          </mesh>
        </Pickable>
        <mesh position={[CARD[0] + 0.02, TABLE_Y + 0.003, CARD[2] + 0.17]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.32, 0.04]} /><meshStandardMaterial map={t.ruler} color="#a39e93" roughness={0.6} />
        </mesh>

        {/* Magnifier (selectable: profile) */}
        <Pickable id="profile">
          <group position={[-0.08, TABLE_Y + 0.02, 0.3]} rotation={[-Math.PI / 2 + 0.12, 0, 0.7]}>
            <mesh castShadow><torusGeometry args={[0.07, 0.007, 12, 48]} /><meshStandardMaterial color="#2b2928" metalness={0.8} roughness={0.3} /></mesh>
            <mesh userData={{ noWire: true }}><circleGeometry args={[0.066, 40]} /><meshStandardMaterial color="#cfe3ea" transparent opacity={0.16} roughness={0.05} metalness={0.2} /></mesh>
            <mesh position={[0, -0.13, 0]} castShadow><cylinderGeometry args={[0.011, 0.013, 0.12, 12]} /><meshStandardMaterial color="#141313" roughness={0.6} /></mesh>
          </group>
        </Pickable>

        {/* Swab tube (selectable: forensic biology & serology) */}
        <Pickable id="bio">
          <group position={[0.78, TABLE_Y + 0.013, -0.18]} rotation={[0, 0.4, Math.PI / 2]}>
            <mesh castShadow><cylinderGeometry args={[0.013, 0.013, 0.16, 16]} /><meshStandardMaterial color="#d9e2e6" transparent opacity={0.55} roughness={0.15} /></mesh>
            <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.015, 0.015, 0.03, 16]} /><meshStandardMaterial color="#8f1d24" roughness={0.5} /></mesh>
          </group>
        </Pickable>

        {/* Set dressing (not selectable): sealed bag, camera, tweezers */}
        <mesh position={[0.98, TABLE_Y + 0.006, 0.3]} rotation={[0, -0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.22, 0.012, 0.28]} />
          <meshStandardMaterial map={t.bag} color="#c9c4ba" transparent roughness={0.25} metalness={0.05} />
        </mesh>
        <group position={[-0.98, TABLE_Y + 0.045, -0.4]} rotation={[0, 0.55, 0]}>
          <mesh castShadow><boxGeometry args={[0.14, 0.09, 0.07]} /><meshStandardMaterial color="#121212" roughness={0.45} metalness={0.3} /></mesh>
          <mesh position={[0.03, 0.006, 0.065]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.034, 0.036, 0.07, 28]} /><meshStandardMaterial color="#0d0d0d" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0.03, 0.006, 0.101]} rotation={[Math.PI / 2, 0, 0]} userData={{ noWire: true }}>
            <circleGeometry args={[0.026, 28]} /><meshStandardMaterial color="#1a2a33" roughness={0.05} metalness={0.9} />
          </mesh>
          <mesh position={[-0.045, 0.052, 0]}><boxGeometry args={[0.03, 0.014, 0.03]} /><meshStandardMaterial color="#8f1d24" roughness={0.5} /></mesh>
        </group>
        <group position={[0.58, TABLE_Y + 0.004, 0.06]} rotation={[0, -0.5, 0]}>
          {[-1, 1].map((sd) => (
            <mesh key={sd} position={[0, 0, sd * 0.004]} rotation={[0, sd * 0.03, 0]} castShadow>
              <boxGeometry args={[0.13, 0.003, 0.006]} /><meshStandardMaterial color="#9a9894" metalness={0.9} roughness={0.25} />
            </mesh>
          ))}
        </group>

        <Marker position={[-0.28, TABLE_Y, -0.32]} rotation={0.3} map={t.m1} />
        <Marker position={[0.62, TABLE_Y, 0.34]} rotation={-0.4} map={t.m2} />
        <Marker position={[0.9, TABLE_Y, -0.45]} rotation={0.15} map={t.m3} />
        <Marker position={[1.6, 0, 0.9]} rotation={-0.2} map={t.m4} />

        {/* Hanging lamp: pivots from the ceiling so it can sway (its light cone sways with it) */}
        <group ref={lamp} position={[0.15, 3.75, 0.05]} userData={{ noWire: true }}>
          <mesh position={[0, -0.6, 0]} userData={{ noWire: true }}><cylinderGeometry args={[0.006, 0.006, 1.2, 6]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, -1.2, 0]} userData={{ noWire: true }}><coneGeometry args={[0.26, 0.24, 32, 1, true]} /><meshStandardMaterial color="#141313" side={THREE.DoubleSide} roughness={0.5} metalness={0.5} /></mesh>
          <mesh position={[0, -1.26, 0]} userData={{ noWire: true }}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial ref={bulb} color="#fff1dc" emissive="#ffd9a8" emissiveIntensity={2.5} toneMapped={false} /></mesh>
          <mesh position={[0, -1.27, 0]} geometry={cone.g} material={cone.m} userData={{ noWire: true }} />
        </group>
        <spotLight
          ref={spot}
          position={[0.15, 2.45, 0.05]}
          angle={0.58}
          penumbra={0.75}
          decay={2}
          distance={7}
          color="#ffe2c2"
          castShadow={quality === "high"}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
        <object3D ref={spotTarget} position={[0.1, TABLE_Y, 0]} />

        {/* Red practical light on the left wall */}
        <mesh position={[-4.15, 2.05, -2.0]}><boxGeometry args={[0.06, 0.34, 0.16]} /><meshStandardMaterial color="#300" emissive="#ff2a2a" emissiveIntensity={3} toneMapped={false} /></mesh>
        <pointLight ref={red} position={[-3.8, 1.9, -1.4]} color="#ff2b24" distance={10} decay={2} />
        <pointLight ref={redFill} position={[2.8, 0.6, -2.6]} color="#a8141c" distance={7} decay={2} />
      </group>
    </>
  );
}
