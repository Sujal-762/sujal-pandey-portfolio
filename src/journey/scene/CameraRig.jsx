import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { journey, damp } from "../store.js";
import { CAMERA_KEYS, FOG_KEYS, atmosphere, sampleKeys, smooth } from "../timeline.js";
import { PHONE } from "./Lab.jsx";

// Map chapter units → curve parameter so the camera passes exactly through every keyframe.
const KEY_U = CAMERA_KEYS.map((k) => k[0]);
function curveParam(u) {
  if (u <= KEY_U[0]) return 0;
  for (let i = 0; i < KEY_U.length - 1; i++) {
    if (u <= KEY_U[i + 1]) return (i + (u - KEY_U[i]) / (KEY_U[i + 1] - KEY_U[i])) / (KEY_U.length - 1);
  }
  return 1;
}

const INTRO_SECONDS = 3.4;
const v = new THREE.Vector3();

/**
 * Drives the camera, atmosphere and DOM anchors from the shared journey progress.
 * - `current` follows `target` with damping (cinematic inertia that reverses coherently).
 * - The opening dolly (first visit per session) adds an offset that decays to 0; skipping zeroes it.
 */
export default function CameraRig() {
  const { camera, scene, size, gl } = useThree();
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0, enabled: false });
  const labFocus = useRef(0);
  const curves = useMemo(() => ({
    pos: new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k[1])), false, "centripetal"),
    look: new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k[2])), false, "centripetal"),
  }), []);
  const fog = useMemo(() => new THREE.FogExp2("#0b0707", 0.055), []);
  const bg = useMemo(() => new THREE.Color("#0b0707"), []);

  useEffect(() => {
    scene.fog = fog;
    scene.background = bg;
    journey.current = journey.target; // never fly in from 0 after a refresh or deep link
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    pointer.current.enabled = fine;
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); scene.fog = null; scene.background = null; };
  }, [scene, fog, bg]);

  // Portrait screens need a wider vertical field of view to keep the composition.
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = aspect < 0.75 ? 64 : aspect < 1.1 ? 54 : 42;
    camera.near = 0.03; camera.far = 120;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const gap = Math.abs(journey.target - journey.current);
    journey.current = damp(journey.current, journey.target, gap > 1.2 ? 5 : 3.2, dt);
    if (Math.abs(journey.target - journey.current) < 1e-4) journey.current = journey.target;
    if (journey.intro > 0) journey.intro = Math.max(0, journey.intro - dt / INTRO_SECONDS);
    const u = journey.current;

    // Camera path
    const t = curveParam(u);
    curves.pos.getPoint(t, camera.position);
    curves.look.getPoint(t, v);

    // Opening dolly: start further back and higher, ease in
    const intro = journey.intro;
    const ie = intro * intro * (3 - 2 * intro);
    camera.position.z += ie * 3.6; camera.position.y += ie * 0.7; v.y += ie * 0.25;

    // Lab: "Device" mode leans the camera toward the fictional phone
    const inLab = smooth(2.95, 3.1, u) * (1 - smooth(3.9, 4.08, u));
    labFocus.current = damp(labFocus.current, journey.labMode === "device" ? 1 : 0, 3, dt);
    const lf = labFocus.current * inLab;
    if (lf > 0.0001) {
      camera.position.x += (PHONE[0] - 0.6 - camera.position.x) * lf * 0.75;
      camera.position.z += (PHONE[2] + 2.0 - camera.position.z) * lf * 0.6;
      v.lerp(new THREE.Vector3(...PHONE), lf * 0.85);
    }

    // Portrait screens: centre the lab print and lift it above the bottom panel
    if (size.width / size.height < 0.9 && inLab > 0) {
      v.x += (0 - v.x) * inLab * 0.9;
      camera.position.x += (0 - camera.position.x) * inLab * 0.9;
      v.y -= 0.75 * inLab;
      camera.position.z += 1.6 * inLab;
    }

    // Tiny desktop parallax
    const p = pointer.current;
    if (p.enabled) {
      p.sx = damp(p.sx, p.x, 2.5, dt); p.sy = damp(p.sy, p.y, 2.5, dt);
      camera.position.x += p.sx * 0.06; camera.position.y -= p.sy * 0.04;
    }
    camera.lookAt(v);

    // Atmosphere
    const a = atmosphere(u);
    const c = sampleKeys(FOG_KEYS, u);
    bg.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
    fog.color.copy(bg);
    fog.density = a.density;
    gl.toneMappingExposure = 1.0 + 0.15 * a.blue;

    // Project DOM anchors (hotspots, lab annotations)
    journey.anchors.forEach((anchor) => {
      const { el, world, range } = anchor;
      if (!el) return;
      const on = u >= range[0] && u <= range[1];
      v.set(world[0], world[1], world[2]).project(camera);
      const visible = on && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      if (visible) {
        el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
      }
      if (el.dataset.onscreen !== String(visible)) el.dataset.onscreen = String(visible);
    });
  });

  return null;
}
