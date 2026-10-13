import { useId } from "react";
import { ridgePaths } from "../lib/ridge.js";

// 2D compositions of the three environments. Shown while the 3D stage loads, and as the complete
// experience for reduced motion or when WebGL is unavailable. Original SVG artwork.

const RIDGES = ridgePaths({ count: 22, step: 0.09 });

/** useId() made safe for use inside url(#…) references. */
function useSafeId() {
  return "p" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

function Room() {
  const id = useSafeId();
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-red`} cx="8%" cy="38%" r="55%"><stop offset="0" stopColor="#ff2b24" stopOpacity=".35" /><stop offset="1" stopColor="#ff2b24" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-lamp`} cx="52%" cy="62%" r="38%"><stop offset="0" stopColor="#ffe2c2" stopOpacity=".28" /><stop offset="1" stopColor="#ffe2c2" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141010" /><stop offset="1" stopColor="#0c0909" /></linearGradient>
        <linearGradient id={`${id}-cone`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe2c2" stopOpacity=".16" /><stop offset="1" stopColor="#ffe2c2" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-wall)`} />
      <path d="M0 560 L1600 560 L1600 900 L0 900 Z" fill="#100c0c" />
      <rect x="520" y="150" width="620" height="320" fill="#1a1615" />
      {[[560, 180, 150, 110, -2], [780, 175, 170, 120, 1.5], [970, 230, 130, 100, -1], [640, 320, 110, 85, 2], [840, 330, 90, 120, 0]].map(([x, y, w, h, r], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="#d9d2c4" opacity=".75" transform={`rotate(${r} ${x + w / 2} ${y + h / 2})`} />
      ))}
      <polyline points="620,200 720,260 880,190 1010,300 690,360" fill="none" stroke="#8f1d24" strokeWidth="2" />
      <path d="M760 0 L760 300" stroke="#0a0808" strokeWidth="3" />
      <path d="M700 300 L820 300 L800 340 L720 340 Z" fill="#141313" />
      <path d="M720 340 L800 340 L1080 900 L440 900 Z" fill={`url(#${id}-cone)`} />
      <path d="M300 640 L1300 640 L1460 820 L140 820 Z" fill="#1f1d1c" />
      <path d="M140 820 L1460 820 L1460 840 L140 840 Z" fill="#0d0c0c" />
      <g transform="translate(860 690) skewX(-30) scale(1 .5)"><rect width="180" height="130" fill="#e9e3d6" /><g fill="none" stroke="#1c1a18" strokeWidth="3" transform="translate(100 15) scale(.17)">{RIDGES.map((d, i) => <path key={i} d={d} />)}</g></g>
      <g transform="translate(420 680) skewX(-30) scale(1 .5)"><rect width="150" height="200" fill="#ddd6c6" /><rect x="10" y="40" width="120" height="6" fill="#555" /><rect x="10" y="60" width="100" height="6" fill="#555" /></g>
      {[[640, 660, 1], [1120, 700, 2], [1240, 655, 3]].map(([x, y, n]) => (
        <g key={n}><path d={`M${x - 18} ${y + 14} L${x} ${y - 22} L${x + 18} ${y + 14} Z`} fill="#d8cfb8" /><text x={x} y={y + 8} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="18" fill="#151313">{n}</text></g>
      ))}
      <rect width="1600" height="900" fill={`url(#${id}-red)`} />
      <rect width="1600" height="900" fill={`url(#${id}-lamp)`} />
    </svg>
  );
}

function Lab() {
  const id = useSafeId();
  const lines = [];
  for (let i = -12; i <= 12; i++) lines.push(<line key={`v${i}`} x1={800 + i * 18} y1="560" x2={800 + i * 140} y2="900" />);
  for (let k = 1; k <= 8; k++) { const y = 560 + 340 * Math.pow(k / 8, 1.8); lines.push(<line key={`h${k}`} x1="0" y1={y} x2="1600" y2={y} />); }
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="45%" r="45%"><stop offset="0" stopColor="#1e6fb4" stopOpacity=".45" /><stop offset="1" stopColor="#1e6fb4" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#020812" />
      <g stroke="#46d8e8" strokeOpacity=".22" strokeWidth="1">{lines}</g>
      <rect width="1600" height="900" fill={`url(#${id}-glow)`} />
      <g fill="none" stroke="#46d8e8" strokeWidth="2.2" strokeOpacity=".85" transform="translate(800 400) scale(.62) translate(-260 -300)">
        {RIDGES.map((d, i) => <path key={i} d={d} />)}
      </g>
      <ellipse cx="800" cy="640" rx="260" ry="40" fill="none" stroke="#46d8e8" strokeOpacity=".5" />
      <g transform="translate(330 330) rotate(-6)"><rect width="120" height="240" rx="18" fill="#050b12" stroke="#46d8e8" strokeWidth="2" />{[0, 1, 2, 3].map((i) => <rect key={i} x="14" y={40 + i * 46} width="92" height="32" fill="#46d8e8" opacity=".14" />)}</g>
    </svg>
  );
}

function Archive() {
  const id = useSafeId();
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-lamp`} cx="62%" cy="58%" r="40%"><stop offset="0" stopColor="#ffb59a" stopOpacity=".3" /><stop offset="1" stopColor="#ffb59a" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-desk`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2019" /><stop offset="1" stopColor="#140f0c" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="#0d0a09" />
      <path d="M180 420 L1420 420 L1600 900 L0 900 Z" fill={`url(#${id}-desk)`} />
      <g transform="translate(700 470) rotate(2)"><rect width="300" height="390" fill="#e6e0d3" />{Array.from({ length: 11 }, (_, i) => <line key={i} x1="0" x2="300" y1={60 + i * 30} y2={60 + i * 30} stroke="#28405a" strokeOpacity=".2" />)}<line x1="44" x2="44" y1="0" y2="390" stroke="#a0282c" strokeOpacity=".45" />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x="60" y={88 + i * 30} width={200 - (i === 4 ? 80 : 0)} height="3" fill="#1a3380" opacity=".7" />)}</g>
      <g transform="translate(260 520) rotate(-6)"><rect width="330" height="230" fill="#5a4a36" /><rect x="20" y="20" width="180" height="56" fill="#cfc6b3" /></g>
      <g transform="translate(1110 500) rotate(5)"><rect width="300" height="210" fill="#4f4130" /><rect x="20" y="20" width="160" height="50" fill="#cfc6b3" /></g>
      <rect width="1600" height="900" fill={`url(#${id}-lamp)`} />
    </svg>
  );
}

const POSTERS = { room: Room, lab: Lab, archive: Archive };

export default function Poster({ kind, className = "" }) {
  const P = POSTERS[kind];
  return <div className={`poster poster--${kind} ${className}`}><P /></div>;
}
