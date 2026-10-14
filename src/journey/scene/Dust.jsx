import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { journey } from "../store.js";
import { sampleKeys } from "../timeline.js";
import { mulberry32 } from "../../lib/ridge.js";

// Dust that always surrounds the camera (wrapped in a moving box) — warm motes in the room and archive,
// faint cyan specks in the lab.
const vertex = /* glsl */ `
attribute vec4 aSeed; uniform vec3 uCam; uniform float uTime, uPR; varying float vA;
void main(){
  vec3 box = vec3(7.0, 4.0, 7.0);
  vec3 p = aSeed.xyz * box + vec3(sin(uTime*0.05 + aSeed.w*6.0)*0.4, -uTime*0.03, cos(uTime*0.04 + aSeed.w*4.0)*0.4);
  p = uCam + mod(p - uCam + box*0.5, box) - box*0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.5 + aSeed.w * 3.0) * uPR * 3.0 / max(0.3, -mv.z);
  vA = smoothstep(0.0, 1.2, -mv.z) * (1.0 - smoothstep(4.0, 7.0, -mv.z)) * (0.25 + aSeed.w * 0.5);
}`;
const fragment = /* glsl */ `
uniform vec3 uColour; uniform float uOpacity; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = (1.0 - smoothstep(0.2, 0.5, d)) * vA * uOpacity; if (a < 0.01) discard; gl_FragColor = vec4(uColour, a);
  #include <colorspace_fragment>
}`;

const COLOUR_KEYS = [[0, [1.0, 0.82, 0.7]], [2.4, [1.0, 0.75, 0.68]], [2.9, [0.4, 0.85, 0.95]], [4.99, [0.35, 0.7, 0.85]]];

export default function Dust({ count }) {
  const { geometry, material } = useMemo(() => {
    const rnd = mulberry32(99);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPR: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColour: { value: new THREE.Color() }, uOpacity: { value: 0.6 } },
    });
    return { geometry: g, material: m };
  }, [count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    const u = journey.current;
    material.uniforms.uCam.value.copy(state.camera.position);
    material.uniforms.uTime.value = journey.time; // the shared ambient clock: slower in calm mode, never frozen
    material.uniforms.uColour.value.setRGB(...sampleKeys(COLOUR_KEYS, u));
    material.uniforms.uOpacity.value = u > 2.4 && u < 2.75 ? 0.25 : 0.6;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
