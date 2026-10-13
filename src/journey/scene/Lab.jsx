import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { journey } from "../store.js";
import { LAB, PRINT, atmosphere } from "../timeline.js";
import { phoneScreen } from "./textures.js";

// Floor grid drawn in a shader: fine cyan lines that fade with distance and pulse gently outward.
const gridVertex = /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const gridFragment = /* glsl */ `
varying vec2 vUv; varying vec3 vW; uniform float uVis, uTime; uniform vec3 uCentre;
float line(float c, float w){ float d = abs(fract(c - 0.5) - 0.5) / fwidth(c); return 1.0 - min(d / w, 1.0); }
void main(){
  vec2 p = vW.xz;
  float g = max(line(p.x * 2.0, 1.0), line(p.y * 2.0, 1.0)) * 0.55 + max(line(p.x * 0.5, 1.2), line(p.y * 0.5, 1.2)) * 0.6;
  float r = length(p - uCentre.xz);
  float fade = 1.0 - smoothstep(2.0, 14.0, r);
  float pulse = exp(-pow((r - mod(uTime * 2.2, 16.0)) * 1.4, 2.0)) * 0.6;
  vec3 col = vec3(0.16, 0.72, 0.85) * (g * (0.35 + pulse)) + vec3(0.02, 0.08, 0.16) * fade * 0.25;
  gl_FragColor = vec4(col, (g * (0.5 + pulse) + 0.12) * fade * uVis);
  #include <colorspace_fragment>
}`;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

export const PHONE = [LAB[0] + 2.35, 1.55, LAB[2] + 0.6];

export default function Lab() {
  const group = useRef();
  const lights = useRef([]);
  const ring = useRef();
  const beams = useRef();
  const screenMat = useRef();
  const lastEvent = useRef(-1);

  const gridMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: gridVertex, fragmentShader: gridFragment, transparent: true, depthWrite: false,
    uniforms: { uVis: { value: 0 }, uTime: { value: 0 }, uCentre: { value: new THREE.Vector3(...LAB) } },
  }), []);

  const phone = useMemo(() => {
    const body = new THREE.ExtrudeGeometry(roundedRect(0.46, 0.94, 0.06), { depth: 0.035, bevelEnabled: false });
    body.translate(0, 0, -0.035);
    const edges = new THREE.EdgesGeometry(new THREE.ShapeGeometry(roundedRect(0.46, 0.94, 0.06), 6));
    return { body, edges, screen: phoneScreen(0) };
  }, []);

  const beamGeo = useMemo(() => new THREE.CylinderGeometry(0.02, 0.9, 6, 24, 1, true), []);
  useEffect(() => () => {
    gridMat.dispose(); phone.body.dispose(); phone.edges.dispose(); phone.screen.dispose(); beamGeo.dispose();
  }, [gridMat, phone, beamGeo]);

  useFrame((state) => {
    const a = atmosphere(journey.current);
    if (group.current) group.current.visible = a.labVis > 0.002;
    gridMat.uniforms.uVis.value = a.labVis;
    gridMat.uniforms.uTime.value = state.clock.elapsedTime;
    lights.current.forEach((l, i) => l && (l.intensity = [22, 14, 9][i] * a.blue));
    if (ring.current) ring.current.material.opacity = 0.75 * a.labVis;
    if (beams.current) beams.current.children.forEach((b) => (b.material.opacity = 0.05 * a.labVis));
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
      <mesh ref={ring} position={[PRINT[0], 0.01, PRINT[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.35, 1.39, 96]} />
        <meshBasicMaterial color="#46d8e8" transparent opacity={0} toneMapped={false} />
      </mesh>
      {/* Soft light shafts (cheap additive cones) */}
      <group ref={beams}>
        {[[-1.6, -1.2], [1.8, -0.6], [0.2, -2.4]].map(([x, z], i) => (
          <mesh key={i} geometry={beamGeo} position={[PRINT[0] + x, 3, PRINT[2] + z]}>
            <meshBasicMaterial color="#2a7fd4" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>

      {/* Device silhouette — a fictional, generic phone */}
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
