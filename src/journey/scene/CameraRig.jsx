import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { journey, damp, setJourney, CALM_AMP, CALM_SPEED } from "../store.js";
import {
  CAMERA_KEYS, FOG_KEYS, restU, PRINT, WALL, WALL_SIZE, EVIDENCE_RANGE, ARCHIVE_RANGE, WALL_RANGE, atmosphere, sampleKeys, smooth,
} from "../timeline.js";
import { hotspots } from "../../content/journey.js";
import { archiveEntries } from "../../content/archive.js";
import { PHONE } from "./ArchiveSpace.jsx";

// Map chapter units → curve parameter so the camera passes exactly through every keyframe.
const KEY_U = CAMERA_KEYS.map((k) => k[0]);
function curveParam(u) {
  if (u <= KEY_U[0]) return 0;
  for (let i = 0; i < KEY_U.length - 1; i++) {
    if (u <= KEY_U[i + 1]) return (i + (u - KEY_U[i]) / (KEY_U[i + 1] - KEY_U[i])) / (KEY_U.length - 1);
  }
  return 1;
}
const inRange = (u, r) => u >= r[0] && u <= r[1];
const FOCUS_BY_ID = Object.fromEntries(hotspots.map((h) => [h.id, h.focus]));
const DEMO_OF = Object.fromEntries(archiveEntries.filter((e) => e.demo).map((e) => [e.id, e.demo]));

const INTRO_SECONDS = 3.4;
const look = new THREE.Vector3();
const fPos = new THREE.Vector3();
const fLook = new THREE.Vector3();
const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Camera pose for the profile-wall close-up, fitted to the screen. Desktop: square-on, with the wall shifted
 * right of the HTML panel (left ≈30%). Phones: the whole wall in the upper part, above the bottom sheet.
 */
function wallPose(fov, aspect, portrait) {
  const tv = Math.tan((fov * Math.PI) / 360);
  const [wx, wy, wz] = WALL;
  const [ww, wh] = WALL_SIZE;
  if (!portrait) {
    const d = Math.max((ww + 0.2) / 0.64 / (2 * tv * aspect), (wh + 0.3) / 0.86 / (2 * tv), 2.6);
    const ox = 0.3 * d * tv * aspect;
    fLook.set(wx - ox, wy, wz);
    fPos.set(wx - ox, wy + 0.04, wz + d);
  } else {
    const d = Math.max((ww + 0.15) / 0.94 / (2 * tv * aspect), (wh + 0.2) / 0.42 / (2 * tv), 2.6);
    fLook.set(wx, wy - 0.52 * d * tv, wz);
    fPos.set(wx, wy + 0.1, wz + d);
  }
}

/** Camera pose for a selected archive entry: its plate, or the print / phone for demonstrations. */
function entryPose(id, portrait) {
  const demo = DEMO_OF[id];
  if (demo === "print") {
    fLook.set(PRINT[0], PRINT[1], PRINT[2]);
    fPos.set(PRINT[0] - 0.2, PRINT[1] + 0.1, PRINT[2] + (portrait ? 5.2 : 3.7));
    return true;
  }
  if (demo === "device") {
    fLook.set(...PHONE);
    fPos.set(PHONE[0] - 0.75, PHONE[1] + 0.05, PHONE[2] + (portrait ? 2.6 : 1.75));
    return true;
  }
  const slot = journey.plates?.get(id);
  if (!slot) return false;
  if (slot.ring) {
    // Portrait ring: the selected plate turns to the front; frame it above the bottom sheet.
    const front = PRINT[2] + slot.ring.R;
    fLook.set(PRINT[0], slot.ring.y - 0.62, front);
    fPos.set(PRINT[0], slot.ring.y + 0.2, front + 4.3);
    return true;
  }
  fLook.set(...slot.pos);
  fPos.set(slot.pos[0] + slot.normal[0] * 2.7, slot.pos[1] + 0.05, slot.pos[2] + slot.normal[2] * 2.7);
  return true;
}

/**
 * The single camera/atmosphere controller (runs inside R3F's one render loop).
 * - Scroll gives journey.target; `current` follows it with damping (or cuts, for reduced motion).
 * - Idle motion: slow "breathing" drift + desktop pointer parallax, so the scene never freezes.
 * - Selection: blends to a close-up of the chosen evidence object / archive entry, and back.
 */
export default function CameraRig() {
  const { camera, scene, size, gl } = useThree();
  const pointer = useRef({ x: 0, y: 0, sx: 0, sy: 0, enabled: false });
  const blend = useRef(0);
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

  // Field of view by aspect ratio: portrait screens need a wider vertical view to keep the composition.
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.fov = aspect < 0.75 ? 62 : aspect < 1.1 ? 54 : 42;
    camera.near = 0.03; camera.far = 120;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const reduced = journey.reduced;
    const portrait = size.width / size.height < 0.9;

    // --- ambient clock ------------------------------------------------------------------------------
    // One clock for every idle animation in the scene. Calm mode slows it and eases the amplitude down
    // (never a hard freeze), so the environment keeps breathing whether or not the visitor scrolls.
    journey.amp = damp(journey.amp, reduced ? CALM_AMP : 1, 1.5, dt);
    journey.time += dt * (reduced ? CALM_SPEED : 1);

    // --- progress ---------------------------------------------------------------------------------
    if (reduced) {
      // Calm: still compositions (including three stages of the transformation), changed by cutting.
      journey.current = restU(journey.target);
      journey.intro = 0;
    } else {
      const gap = Math.abs(journey.target - journey.current);
      journey.current = damp(journey.current, journey.target, gap > 1.2 ? 5 : 3.2, dt);
      if (Math.abs(journey.target - journey.current) < 1e-4) journey.current = journey.target;
      if (journey.intro > 0) journey.intro = Math.max(0, journey.intro - dt / INTRO_SECONDS);
    }
    const u = journey.current;
    const t = journey.time;

    // --- path pose --------------------------------------------------------------------------------
    curves.pos.getPoint(curveParam(u), camera.position);
    curves.look.getPoint(curveParam(u), look);

    // Opening dolly: start further back and higher, ease in
    const ie = journey.intro * journey.intro * (3 - 2 * journey.intro);
    camera.position.z += ie * 3.6; camera.position.y += ie * 0.7; look.y += ie * 0.25;

    // Portrait framing: pull back in the room; centre and lift the archive above the bottom sheet.
    if (portrait) {
      const inRoom = 1 - smooth(2.4, 2.8, u);
      if (inRoom > 0) {
        tmp.subVectors(camera.position, look).normalize();
        camera.position.addScaledVector(tmp, 0.75 * inRoom);
        // Opening shot: the name sits low on phones, so compose the room in the upper half of the screen,
        // turned toward the profile wall (a narrow screen cannot hold the board, table and wall at once).
        const opening = 1 - smooth(0.35, 0.95, u);
        look.y -= 0.8 * (1 - smooth(0.55, 1.0, u));
        look.x += 2.4 * opening; camera.position.x += 2.0 * opening;
      }
      const inArch = smooth(2.85, 3.05, u);
      if (inArch > 0) {
        look.x += (PRINT[0] - look.x) * inArch;
        camera.position.x += (PRINT[0] - camera.position.x) * inArch;
        look.y -= 0.85 * inArch;
        camera.position.z += 2.2 * inArch;
      }
    }

    // --- selection close-ups ------------------------------------------------------------------------
    // The pose (fPos/fLook) is computed only while something is selected; while blending back out the last
    // pose is reused as-is (offsets are applied once, so nothing drifts).
    if (journey.wall && u > WALL_RANGE[1] + 0.05) setJourney({ wall: false }); // scrolled on: close the wall view
    const aspect = size.width / size.height;
    // Keep the subject clear of the detail panel: right panel on desktop, bottom sheet on phones.
    const clearPanel = () => {
      tmp.subVectors(fLook, fPos).normalize().cross(UP).normalize();
      if (!portrait) fLook.addScaledVector(tmp, 0.32); else fLook.y -= 0.22;
    };
    let want = 0;
    if (journey.wall && u <= WALL_RANGE[1]) {
      wallPose(camera.fov, aspect, portrait);
      want = 1;
    } else if (journey.focus && inRange(u, EVIDENCE_RANGE) && FOCUS_BY_ID[journey.focus]) {
      const f = FOCUS_BY_ID[journey.focus];
      fPos.set(...f.pos); fLook.set(...f.look);
      if (portrait) { tmp.subVectors(fPos, fLook).multiplyScalar(0.45); fPos.add(tmp); }
      clearPanel();
      want = 1;
    } else if (journey.entry && inRange(u, ARCHIVE_RANGE) && entryPose(journey.entry, portrait)) {
      clearPanel();
      want = 1;
    }
    blend.current = reduced ? want : damp(blend.current, want, 2.6, dt);
    if (blend.current > 0.0005) {
      camera.position.lerp(fPos, blend.current);
      look.lerp(fLook, blend.current);
    }

    // --- idle motion (never with reduced motion) ------------------------------------------------------
    if (!reduced) {
      camera.position.x += 0.035 * Math.sin(t * 0.21);
      camera.position.y += 0.022 * Math.sin(t * 0.17 + 1.1);
      look.x += 0.03 * Math.sin(t * 0.13 + 0.4);
      const p = pointer.current;
      if (p.enabled) {
        p.sx = damp(p.sx, p.x, 2.5, dt); p.sy = damp(p.sy, p.y, 2.5, dt);
        const k = 1 - blend.current * 0.7; // calmer while inspecting
        camera.position.x += p.sx * 0.08 * k; camera.position.y -= p.sy * 0.05 * k;
      }
    }
    camera.lookAt(look);

    // --- atmosphere ---------------------------------------------------------------------------------
    const a = atmosphere(u);
    const c = sampleKeys(FOG_KEYS, u);
    bg.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
    fog.color.copy(bg);
    fog.density = a.density;
    gl.toneMappingExposure = 1.0 + 0.15 * a.blue;

    // --- DOM anchors (labels that follow 3D points) ---------------------------------------------------
    journey.anchors.forEach((anchor) => {
      const { el, world, range } = anchor;
      if (!el) return;
      const on = u >= range[0] && u <= range[1];
      tmp.set(world[0], world[1], world[2]).project(camera);
      const visible = on && tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      if (visible) el.style.transform = `translate(${((tmp.x + 1) / 2) * size.width}px, ${((1 - tmp.y) / 2) * size.height}px)`;
      if (el.dataset.onscreen !== String(visible)) el.dataset.onscreen = String(visible);
    });
  });

  return null;
}
