import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { journey, emit } from "./store.js";
import Room from "./scene/Room.jsx";
import ArchiveSpace from "./scene/ArchiveSpace.jsx";
import Particles from "./scene/Particles.jsx";
import Dust from "./scene/Dust.jsx";
import CameraRig from "./scene/CameraRig.jsx";

/**
 * Starting quality from capabilities that actually affect GPU cost (screen size, pointer type, CPU
 * threads, device memory where reported) — never the user-agent string. AdaptiveResolution then
 * corrects it from measured frame times.
 */
function detectQuality() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  return coarse || small || cores <= 4 || memory <= 4 ? "low" : "high";
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

/** Stops rendering entirely while the tab is hidden, and resumes cleanly (no time jump). */
function VisibilityPause() {
  const { setFrameloop, clock } = useThree();
  useEffect(() => {
    const onChange = () => {
      if (document.hidden) { setFrameloop("never"); clock.stop(); }
      else { clock.start(); setFrameloop("always"); }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [setFrameloop, clock]);
  return null;
}

/** Measures frame time and steps the render resolution down (or back up) to keep motion smooth. */
function AdaptiveResolution({ min, max }) {
  const { setDpr } = useThree();
  const s = useRef({ dpr: max, acc: 0, n: 0, good: 0 });
  useFrame((_, delta) => {
    const st = s.current;
    if (delta > 0.5) return; // ignore pauses / tab switches
    st.acc += delta; st.n++;
    if (st.acc < 1.5) return;
    const avg = st.acc / st.n;
    st.acc = 0; st.n = 0;
    if (avg > 1 / 36 && st.dpr > min) { st.dpr = Math.max(min, +(st.dpr - 0.25).toFixed(2)); st.good = 0; setDpr(st.dpr); }
    else if (avg < 1 / 55 && st.dpr < max && ++st.good >= 3) { st.dpr = Math.min(max, +(st.dpr + 0.25).toFixed(2)); st.good = 0; setDpr(st.dpr); }
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

  useEffect(() => () => { journey.stageReady = false; document.body.style.cursor = ""; emit(); }, []);

  if (!fontsReady) return null;
  const low = quality === "low";
  const dpr = low ? [0.75, 1.4] : [1, 1.75];

  return (
    <Canvas
      className="stage__canvas"
      aria-hidden="true"
      dpr={[dpr[0], Math.min(dpr[1], window.devicePixelRatio || 1)]}
      shadows={!low}
      // Pointer events come from the whole page, so 3D objects stay clickable beneath the text overlay.
      eventSource={document.getElementById("root")}
      eventPrefix="client"
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
        <ArchiveSpace quality={quality} />
        <Particles count={low ? 2600 : 5200} />
        <Dust count={low ? 220 : 520} />
        <ReadySignal onReady={() => { journey.stageReady = true; emit(); onReady?.(); }} />
        <ContextWatch onFail={onFail} />
        <VisibilityPause />
        <AdaptiveResolution min={dpr[0]} max={Math.min(dpr[1], window.devicePixelRatio || 1)} />
      </Suspense>
    </Canvas>
  );
}
