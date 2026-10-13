import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { journey } from "../store.js";
import { CARD, TABLE_Y, atmosphere, cardScan } from "../timeline.js";
import * as tex from "./textures.js";

/** Disposes every texture in an object when the component unmounts. */
function useDisposable(factory, deps = []) {
  const value = useMemo(factory, deps);
  useEffect(() => () => Object.values(value).forEach((t) => t?.dispose?.()), [value]);
  return value;
}

function Marker({ n, position, rotation = 0, map }) {
  // Folded A-frame evidence marker
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.032, 0.016]} rotation={[-0.5, 0, 0]} castShadow>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={map} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.032, -0.016]} rotation={[0.5, Math.PI, 0]} castShadow>
        <planeGeometry args={[0.07, 0.07]} />
        <meshStandardMaterial map={map} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default function Room({ quality }) {
  const group = useRef();
  const red = useRef();
  const redFill = useRef();
  const spot = useRef();
  const bulb = useRef();
  const scan = useRef();
  const spotTarget = useRef();

  // A spotlight target must be in the scene graph so its matrix updates.
  useEffect(() => { if (spot.current && spotTarget.current) spot.current.target = spotTarget.current; }, []);

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
    m1: tex.markerTent(1), m2: tex.markerTent(2), m3: tex.markerTent(3),
  }));

  // Red string between board pins
  const string = useMemo(() => {
    const pts = [[-0.95, 2.2], [-0.15, 1.95], [0.7, 2.25], [1.25, 1.55], [0.1, 1.35]].map(([x, y]) => new THREE.Vector3(x, y, -3.08));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = new THREE.LineBasicMaterial({ color: "#7a1418" });
    return { line: new THREE.Line(g, m), pins: pts };
  }, []);
  useEffect(() => () => { string.line.geometry.dispose(); string.line.material.dispose(); }, [string]);

  useFrame(() => {
    const u = journey.current;
    const a = atmosphere(u);
    if (group.current) group.current.visible = a.roomVis > 0.002;
    if (red.current) red.current.intensity = 13 * a.red;
    if (redFill.current) redFill.current.intensity = 3.5 * a.red;
    if (spot.current) spot.current.intensity = 78 * a.warm;
    if (bulb.current) bulb.current.emissiveIntensity = 2.5 * a.warm;
    const s = cardScan(u);
    if (scan.current) {
      scan.current.visible = s > 0.001 && s < 0.999;
      scan.current.position.z = CARD[2] - 0.13 + s * 0.26;
    }
  });

  const wallMat = <meshStandardMaterial map={t.wall} color="#5a5350" roughness={0.95} />;

  return (
    <group ref={group}>
      {/* Floor + walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial map={t.floor} color="#6b6460" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2.5, -3.2]} receiveShadow><planeGeometry args={[14, 5]} />{wallMat}</mesh>
      <mesh position={[-4.2, 2.5, 0.5]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[12, 5]} />{wallMat}</mesh>
      <mesh position={[4.2, 2.5, 0.5]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[12, 5]} />{wallMat}</mesh>

      {/* Evidence board */}
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
          <meshStandardMaterial map={map} roughness={0.85} />
        </mesh>
      ))}
      <primitive object={string.line} />
      {string.pins.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, -3.075]}><sphereGeometry args={[0.018, 10, 10]} /><meshStandardMaterial color="#8f1d24" roughness={0.4} /></mesh>
      ))}

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

      {/* On the table */}
      <mesh position={CARD} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.36, 0.253]} />
        <meshStandardMaterial map={t.card} roughness={0.75} />
      </mesh>
      <mesh ref={scan} position={[CARD[0], CARD[1] + 0.004, CARD[2]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[0.38, 0.006]} />
        <meshBasicMaterial color="#ff5a50" transparent opacity={0.9} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh position={[-0.56, TABLE_Y + 0.003, -0.12]} rotation={[-Math.PI / 2, 0, 0.18]} receiveShadow>
        <planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial map={t.doc1} roughness={0.8} />
      </mesh>
      <mesh position={[-0.82, TABLE_Y + 0.005, 0.12]} rotation={[-Math.PI / 2, 0, -0.12]} receiveShadow>
        <planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial map={t.doc2} roughness={0.8} />
      </mesh>
      <mesh position={[CARD[0] + 0.02, TABLE_Y + 0.003, CARD[2] + 0.17]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.32, 0.04]} /><meshStandardMaterial map={t.ruler} roughness={0.6} />
      </mesh>

      {/* Magnifier */}
      <group position={[-0.08, TABLE_Y + 0.02, 0.3]} rotation={[-Math.PI / 2 + 0.12, 0, 0.7]}>
        <mesh castShadow><torusGeometry args={[0.07, 0.007, 12, 48]} /><meshStandardMaterial color="#2b2928" metalness={0.8} roughness={0.3} /></mesh>
        <mesh><circleGeometry args={[0.066, 40]} /><meshStandardMaterial color="#cfe3ea" transparent opacity={0.16} roughness={0.05} metalness={0.2} /></mesh>
        <mesh position={[0, -0.13, 0]} castShadow><cylinderGeometry args={[0.011, 0.013, 0.12, 12]} /><meshStandardMaterial color="#141313" roughness={0.6} /></mesh>
      </group>

      {/* Swab tube */}
      <group position={[0.78, TABLE_Y + 0.013, -0.18]} rotation={[0, 0.4, Math.PI / 2]}>
        <mesh castShadow><cylinderGeometry args={[0.013, 0.013, 0.16, 16]} /><meshStandardMaterial color="#d9e2e6" transparent opacity={0.55} roughness={0.15} /></mesh>
        <mesh position={[0, 0.09, 0]}><cylinderGeometry args={[0.015, 0.015, 0.03, 16]} /><meshStandardMaterial color="#8f1d24" roughness={0.5} /></mesh>
      </group>

      <Marker n={1} position={[-0.28, TABLE_Y, -0.32]} rotation={0.3} map={t.m1} />
      <Marker n={2} position={[0.62, TABLE_Y, 0.34]} rotation={-0.4} map={t.m2} />
      <Marker n={3} position={[0.9, TABLE_Y, -0.45]} rotation={0.15} map={t.m3} />

      {/* Hanging lamp over the table */}
      <group position={[0.15, 2.55, 0.05]}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.006, 0.006, 1.2, 6]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh><coneGeometry args={[0.26, 0.24, 32, 1, true]} /><meshStandardMaterial color="#141313" side={THREE.DoubleSide} roughness={0.5} metalness={0.5} /></mesh>
        <mesh position={[0, -0.06, 0]}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial ref={bulb} color="#fff1dc" emissive="#ffd9a8" emissiveIntensity={2.5} toneMapped={false} /></mesh>
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
  );
}
