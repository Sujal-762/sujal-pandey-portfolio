import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { journey, setJourney } from "../store.js";
import { WALL, WALL_SIZE, WALL_RANGE, atmosphere } from "../timeline.js";
import { openWallTarget } from "../useJourney.js";
import { wall as wallText } from "../../content/record.js";
import sketchUrl from "../../assets/sketch/sujal-pandey-sketch.svg";
import * as tex from "./textures.js";
import { fromScene } from "./Room.jsx";

// The visitor's profile, installed on the empty right-hand section of the back wall: a framed ORIGINAL
// illustration (never the photograph), name lettering, an engraved plate and three pinned cards.
// Click / tap the wall → camera close-up + readable HTML panel; in the close-up the sketch and cards act as
// links (same actions as the panel's buttons, which are the keyboard path).

const [PW, PH] = WALL_SIZE;
const CARD_W = 0.84, CARD_H = 0.56, CARD_Y = -0.66;
const CARDS = [
  { id: "interests", x: -0.9, tag: "P-01", heading: "AREAS OF INTEREST", items: wallText.interests },
  { id: "achievements", x: 0, tag: "P-02", heading: "ACHIEVEMENTS", items: wallText.achievements },
  { id: "leadership", x: 0.9, tag: "P-03", heading: "LEADERSHIP", items: [], sub: wallText.leadership },
];
const SKETCH = { x: -0.78, y: 0.3, w: 0.86, h: 1.08 };

const live = () => journey.current >= WALL_RANGE[0] && journey.current <= WALL_RANGE[1];

/** Soft drop-shadow texture (cheaper and softer than a real-time shadow map for flat wall items). */
function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  ctx.filter = "blur(14px)";
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(26, 26, 76, 76);
  return new THREE.CanvasTexture(c);
}

/** A region of the wall that responds to pointer and touch. */
function Region({ id, children, ...props }) {
  return (
    <group
      {...props}
      onPointerOver={(e) => {
        if (!live() || !fromScene(e)) return;
        e.stopPropagation();
        setJourney({ hover: `wall:${id}` });
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (journey.hover === `wall:${id}`) setJourney({ hover: null });
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        if (!live() || !fromScene(e)) return;
        e.stopPropagation();
        // First click inspects the wall; inside the close-up, each region does what it says.
        if (!journey.wall) { journey.intro = 0; setJourney({ wall: true }); return; }
        openWallTarget(id);
      }}
    >
      {children}
    </group>
  );
}

export default function ProfileWall({ quality }) {
  const spot = useRef();
  const target = useRef();
  const glow = useRef({});
  const underline = useRef();
  const [sketch, setSketch] = useState(null);

  const t = useMemo(() => {
    const cards = Object.fromEntries(CARDS.map((c) => [c.id, tex.wallCard(c)]));
    return {
      board: tex.concrete(9, [2, 2]),
      name: tex.wallName(wallText),
      plate: tex.wallPlate(wallText.plate),
      label: tex.brassLabel("ILLUSTRATED PORTRAIT"),
      shadow: shadowTexture(),
      cards,
    };
  }, []);
  useEffect(() => () => {
    [t.board, t.name, t.plate, t.label, t.shadow, ...Object.values(t.cards).map((c) => c.texture)].forEach((x) => x.dispose());
  }, [t]);

  // The illustration is an SVG asset rasterised once into a texture (1200 × 1520).
  useEffect(() => {
    let alive = true, loaded = null;
    tex.imageTexture(sketchUrl, 1200, 1520).then((tx) => { loaded = tx; if (alive) setSketch(tx); else tx?.dispose(); });
    return () => { alive = false; loaded?.dispose(); };
  }, []);

  useEffect(() => { if (spot.current && target.current) spot.current.target = target.current; }, []);

  // "Digital Forensics" line on the interests card → its own click region (navigates to the archive).
  const dfBand = t.cards.interests.bands[1];
  const dfY = CARD_Y + CARD_H / 2 - ((dfBand[0] + dfBand[1]) / 2) * CARD_H;
  const dfH = (dfBand[1] - dfBand[0]) * CARD_H;

  useFrame(() => {
    const a = atmosphere(journey.current);
    if (spot.current) spot.current.intensity = 22 * a.warm;
    const focus = journey.wall;
    const h = typeof journey.hover === "string" && journey.hover.startsWith("wall:") ? journey.hover.slice(5) : null;
    // Hover feedback only in the close-up, and only a faint warm lift (no flashing).
    for (const [id, m] of Object.entries(glow.current)) {
      if (!m) continue;
      const on = focus && h === id;
      m.emissiveIntensity += ((on ? 0.22 : 0) - m.emissiveIntensity) * 0.2;
    }
    if (underline.current) underline.current.visible = focus && h === "archive";
  });

  const mat = (id, props) => (
    <meshStandardMaterial ref={(m) => (glow.current[id] = m)} emissive="#ff8a70" emissiveIntensity={0} {...props} />
  );
  const shadowAt = (x, y, w, h) => (
    <mesh position={[x + 0.025, y - 0.035, 0.0165]} userData={{ noWire: true }}>
      <planeGeometry args={[w * 1.28, h * 1.28]} />
      <meshBasicMaterial map={t.shadow} transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );

  return (
    <group position={WALL}>
      {/* Backboard with a thin metal trim */}
      <Region id="about">
        <mesh receiveShadow>
          <boxGeometry args={[PW, PH, 0.03]} />
          <meshStandardMaterial map={t.board} color="#3a3633" roughness={0.94} />
        </mesh>
      </Region>
      {[[0, PH / 2, PW + 0.04, 0.02], [0, -PH / 2, PW + 0.04, 0.02], [PW / 2, 0, 0.02, PH], [-PW / 2, 0, 0.02, PH]].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.01]}>
          <boxGeometry args={[w, h, 0.04]} />
          <meshStandardMaterial color="#4a4744" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}

      {/* Framed illustration (original artwork) + caption plate */}
      <Region id="sketch" position={[SKETCH.x, SKETCH.y, 0]}>
        {shadowAt(0, 0, SKETCH.w, SKETCH.h)}
        {[[0, SKETCH.h / 2 - 0.025, SKETCH.w, 0.05], [0, -SKETCH.h / 2 + 0.025, SKETCH.w, 0.05], [SKETCH.w / 2 - 0.025, 0, 0.05, SKETCH.h], [-SKETCH.w / 2 + 0.025, 0, 0.05, SKETCH.h]].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0.038]} castShadow={quality === "high"}>
            <boxGeometry args={[w, h, 0.045]} />
            <meshStandardMaterial color="#121110" roughness={0.45} metalness={0.2} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[SKETCH.w - 0.1, SKETCH.h - 0.1]} />
          {mat("sketch", { color: "#d8d2c5", roughness: 0.95 })}
        </mesh>
        {/* Mounted once its texture exists: a material created without a map would not pick one up later. */}
        {sketch && (
          <mesh position={[0, 0.01, 0.022]}>
            <planeGeometry args={[0.62, 0.786]} />
            <meshStandardMaterial map={sketch} color="#d9d4ca" roughness={0.9} />
          </mesh>
        )}
        <mesh position={[0, -SKETCH.h / 2 - 0.075, 0.02]}>
          <planeGeometry args={[0.42, 0.07]} />
          <meshStandardMaterial map={t.label} metalness={0.6} roughness={0.35} />
        </mesh>
      </Region>

      {/* Name lettering + engraved plate */}
      <Region id="about">
        <mesh position={[0.42, 0.6, 0.017]}>
          <planeGeometry args={[1.5, 0.8]} />
          <meshStandardMaterial map={t.name} transparent alphaTest={0.05} roughness={0.7} depthWrite={false} />
        </mesh>
        {shadowAt(0.36, -0.05, 1.36, 0.4)}
        <mesh position={[0.36, -0.05, 0.024]}>
          <boxGeometry args={[1.36, 0.4, 0.012]} />
          {mat("about", { map: t.plate, color: "#c9c2b6", metalness: 0.55, roughness: 0.42 })}
        </mesh>
      </Region>

      {/* Pinned cards with evidence-style tags */}
      {CARDS.map((c, i) => (
        <Region key={c.id} id={c.id === "interests" ? "interests" : c.id} position={[c.x, CARD_Y, 0]}>
          {shadowAt(0, 0, CARD_W, CARD_H)}
          <mesh position={[0, 0, 0.02]} rotation={[0, 0, [0.012, -0.008, 0.01][i]]}>
            <planeGeometry args={[CARD_W, CARD_H]} />
            {mat(c.id, { map: t.cards[c.id].texture, color: "#cfc8bc", roughness: 0.88 })}
          </mesh>
          <mesh position={[0, CARD_H / 2 - 0.04, 0.03]}>
            <sphereGeometry args={[0.016, 12, 12]} />
            <meshStandardMaterial color="#8f1d24" roughness={0.4} />
          </mesh>
        </Region>
      ))}
      {/* "Digital Forensics" → archive */}
      <Region id="archive" position={[CARDS[0].x, dfY, 0.026]}>
        <mesh userData={{ noWire: true }}>
          <planeGeometry args={[CARD_W * 0.86, dfH]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh ref={underline} position={[0.02, -dfH / 2 + 0.01, 0.001]} visible={false} userData={{ noWire: true }}>
          <planeGeometry args={[CARD_W * 0.7, 0.006]} />
          <meshBasicMaterial color="#c8443f" toneMapped={false} />
        </mesh>
      </Region>

      {/* Picture light above, a thin crimson accent strip below */}
      <mesh position={[0, PH / 2 + 0.16, 0.12]}>
        <boxGeometry args={[1.3, 0.04, 0.08]} />
        <meshStandardMaterial color="#121111" metalness={0.7} roughness={0.35} />
      </mesh>
      <spotLight ref={spot} position={[0, PH / 2 + 0.28, 0.75]} angle={0.95} penumbra={0.85} decay={2} distance={5} color="#ffe0c4" />
      <object3D ref={target} position={[0, -0.15, 0]} />
      <mesh position={[0, -PH / 2 - 0.035, 0.03]} userData={{ noWire: true }}>
        <boxGeometry args={[PW - 0.2, 0.012, 0.02]} />
        <meshStandardMaterial color="#300" emissive="#ff2a2a" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}
