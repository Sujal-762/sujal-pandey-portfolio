import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { journey } from "../store.js";
import { DESK, DESK_Y, PAPER, atmosphere } from "../timeline.js";
import * as tex from "./textures.js";

/** The archive desk: ruled paper (where the data trace lands), folders, a warm-red desk lamp. */
export default function Desk({ quality }) {
  const group = useRef();
  const lamp = useRef();
  const fill = useRef();
  const bulb = useRef();
  const target = useRef();

  const t = useMemo(() => ({
    floor: tex.concrete(14, [6, 6]),
    wood: tex.steel(),
    paper: tex.ruledPaper(),
    f1: tex.folderLabel("Dossiers", "IN PREPARATION"),
    f2: tex.folderLabel("Case studies", "VERIFIED SOURCES ONLY"),
    f3: tex.folderLabel("Projects", "PENDING VERIFICATION"),
  }), []);
  useEffect(() => () => Object.values(t).forEach((x) => x.dispose()), [t]);
  useEffect(() => { if (lamp.current && target.current) lamp.current.target = target.current; }, []);

  useFrame(() => {
    const a = atmosphere(journey.current);
    if (group.current) group.current.visible = a.deskVis > 0.002;
    if (lamp.current) lamp.current.intensity = 30 * a.deskVis * Math.max(0.35, a.warm + 0.4);
    if (fill.current) fill.current.intensity = 6 * a.deskVis * a.red;
    if (bulb.current) bulb.current.emissiveIntensity = 2 * a.deskVis;
  });

  const folder = (map, pos, rot) => (
    <group position={pos} rotation={[0, rot, 0]}>
      <mesh castShadow receiveShadow><boxGeometry args={[0.52, 0.014, 0.38]} /><meshStandardMaterial color="#5a4a36" roughness={0.9} /></mesh>
      <mesh position={[-0.08, 0.0075, -0.12]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, 0.094]} /><meshStandardMaterial map={map} roughness={0.85} /></mesh>
    </group>
  );

  return (
    <group ref={group} visible={false}>
      <mesh position={[DESK[0], 0, DESK[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} /><meshStandardMaterial map={t.floor} color="#3c3533" roughness={0.95} />
      </mesh>
      <mesh position={[DESK[0], DESK_Y - 0.025, DESK[2]]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.05, 1.25]} /><meshStandardMaterial map={t.wood} color="#4a3a2e" roughness={0.6} metalness={0.15} />
      </mesh>
      {[[-1.05, -0.55], [1.05, -0.55], [-1.05, 0.55], [1.05, 0.55]].map(([x, z], i) => (
        <mesh key={i} position={[DESK[0] + x, (DESK_Y - 0.05) / 2, DESK[2] + z]}><boxGeometry args={[0.06, DESK_Y - 0.05, 0.06]} /><meshStandardMaterial color="#1a1512" /></mesh>
      ))}
      <mesh position={PAPER} rotation={[-Math.PI / 2, 0, 0.02]} receiveShadow>
        <planeGeometry args={[0.44, 0.6]} /><meshStandardMaterial map={t.paper} roughness={0.85} />
      </mesh>
      {folder(t.f1, [DESK[0] - 0.68, DESK_Y + 0.008, DESK[2] + 0.05], 0.12)}
      {folder(t.f2, [DESK[0] - 0.62, DESK_Y + 0.024, DESK[2] + 0.02], 0.05)}
      {folder(t.f3, [DESK[0] + 0.66, DESK_Y + 0.008, DESK[2] - 0.1], -0.18)}

      {/* Desk lamp */}
      <group position={[DESK[0] + 0.72, DESK_Y, DESK[2] - 0.42]}>
        <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.09, 0.1, 0.02, 24]} /><meshStandardMaterial color="#141212" metalness={0.6} roughness={0.4} /></mesh>
        <mesh position={[0, 0.26, 0]} rotation={[0, 0, 0.25]}><cylinderGeometry args={[0.008, 0.008, 0.52, 8]} /><meshStandardMaterial color="#141212" /></mesh>
        <mesh position={[-0.12, 0.5, 0.05]} rotation={[0.3, 0, 0.9]}><coneGeometry args={[0.1, 0.16, 24, 1, true]} /><meshStandardMaterial color="#2a0d0e" side={THREE.DoubleSide} /></mesh>
        <mesh position={[-0.16, 0.46, 0.08]}><sphereGeometry args={[0.025, 12, 12]} /><meshStandardMaterial ref={bulb} color="#ffd0b8" emissive="#ff9a7a" emissiveIntensity={0} toneMapped={false} /></mesh>
      </group>
      <spotLight ref={lamp} position={[DESK[0] + 0.56, DESK_Y + 0.46, DESK[2] - 0.34]} angle={0.75} penumbra={0.85}
        decay={2} distance={5} color="#ffb59a" castShadow={quality === "high"} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <object3D ref={target} position={[PAPER[0] - 0.1, DESK_Y, PAPER[2]]} />
      <pointLight ref={fill} position={[DESK[0] - 2, 1.4, DESK[2] - 1.5]} color="#9c1a20" distance={7} decay={2} />
    </group>
  );
}
