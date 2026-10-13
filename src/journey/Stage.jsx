import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { journey, emit } from "./store.js";
import Room from "./scene/Room.jsx";
import Lab from "./scene/Lab.jsx";
import Desk from "./scene/Desk.jsx";
import Particles from "./scene/Particles.jsx";
import Dust from "./scene/Dust.jsx";
import CameraRig from "./scene/CameraRig.jsx";

function detectQuality() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const cores = navigator.hardwareConcurrency || 4;
  return coarse || small || cores <= 4 ? "low" : "high";
}

/** Marks the stage ready after the first rendered frame (so the 2D poster can fade out). */
function ReadySignal({ onReady }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady());
  });
  return null;
}

/** Reports WebGL context loss so the page can fall back to the 2D posters. */
function ContextWatch({ onFail }) {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e) => { e.preventDefault(); onFail("context-lost"); };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, onFail]);
  return null;
}

export default function Stage({ onReady, onFail }) {
  const [quality] = useState(detectQuality);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const ready = document.fonts?.ready ?? Promise.resolve();
    Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => alive && setFontsReady(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => () => { journey.stageReady = false; emit(); }, []);

  if (!fontsReady) return null;
  const low = quality === "low";

  return (
    <Canvas
      className="stage__canvas"
      aria-hidden="true"
      dpr={low ? [1, 1.4] : [1, 1.75]}
      shadows={!low}
      gl={{ antialias: !low, powerPreference: "high-performance", alpha: false, stencil: false }}
      camera={{ fov: 42, near: 0.03, far: 120, position: [0, 1.85, 5.8] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        // A GPU that cannot compile a shader would otherwise show a broken scene: fall back to the 2D posters.
        gl.debug.onShaderError = () => onFail?.("shader");
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.2} color="#b9aba3" />
        <hemisphereLight args={["#2a2222", "#060506", 0.25]} />
        <CameraRig />
        <Room quality={quality} />
        <Lab />
        <Desk quality={quality} />
        <Particles count={low ? 2400 : 5200} />
        <Dust count={low ? 220 : 520} />
        <ReadySignal onReady={() => { journey.stageReady = true; emit(); onReady?.(); }} />
        <ContextWatch onFail={onFail} />
      </Suspense>
    </Canvas>
  );
}
