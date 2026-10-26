// Generates transparent placeholder garments for the demo brand.
// Coordinate system (shared with scripts/prepare-garment.mjs framing):
// viewBox "-20 -10 640 760", collar centered at x=300, y≈40.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "brands", "offcut", "products");
mkdirSync(outDir, { recursive: true });

const FONT = "'Arial Black','Helvetica Neue',Arial,sans-serif";
const MONO = "'Courier New',monospace";

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => {
    const target = amount < 0 ? 0 : 255;
    return Math.round(c + (target - c) * Math.abs(amount));
  };
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function text(x, y, value, { size = 24, fill, spacing = 0, anchor = "middle", font = FONT, weight = 900, opacity = 1 } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-weight="${weight}" font-size="${size}" letter-spacing="${spacing}" fill="${fill}" opacity="${opacity}">${value}</text>`;
}

function ribbing(x1, x2, y1, y2, color, step = 7) {
  let out = "";
  for (let x = x1 + step; x < x2; x += step) {
    out += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${color}" stroke-width="1.4" opacity="0.35"/>`;
  }
  return out;
}

function svg({ silhouette, base, layers, outline = 0.28 }) {
  const dark = shade(base, -0.45);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -10 640 760" width="640" height="760">
<defs>
  <clipPath id="g"><path d="${silhouette}"/></clipPath>
  <linearGradient id="h" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity="0.22"/>
    <stop offset="0.2" stop-color="#000" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#fff" stop-opacity="0.07"/>
    <stop offset="0.8" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.24"/>
  </linearGradient>
  <linearGradient id="v" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.08"/>
    <stop offset="0.6" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.16"/>
  </linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="noise" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.16"/></feComponentTransfer>
  </filter>
</defs>
<path d="${silhouette}" fill="#000" opacity="0.16" filter="url(#shadow)" transform="translate(6 14)"/>
<g clip-path="url(#g)">
  <rect x="-20" y="-10" width="640" height="760" fill="${base}"/>
  <g filter="url(#soft)" fill="none" stroke-linecap="round">
    <path d="M205 290 Q222 470 192 650" stroke="#000" stroke-opacity="0.16" stroke-width="10"/>
    <path d="M398 310 Q380 470 412 650" stroke="#000" stroke-opacity="0.14" stroke-width="10"/>
    <path d="M150 250 Q205 275 238 236" stroke="#000" stroke-opacity="0.14" stroke-width="8"/>
    <path d="M450 250 Q395 275 362 236" stroke="#000" stroke-opacity="0.14" stroke-width="8"/>
    <path d="M300 200 Q292 420 310 640" stroke="#fff" stroke-opacity="0.08" stroke-width="22"/>
  </g>
  ${layers}
  <rect x="-20" y="-10" width="640" height="760" fill="url(#h)"/>
  <rect x="-20" y="-10" width="640" height="760" fill="url(#v)"/>
  <rect x="-20" y="-10" width="640" height="760" filter="url(#noise)"/>
</g>
<path d="${silhouette}" fill="none" stroke="${dark}" stroke-opacity="${outline}" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;
}

/* ---------------------------------------------------------------- shapes */

const TEE = "M235 40 Q300 50 365 40 L480 82 Q540 108 582 250 L505 292 L462 238 L458 676 Q300 688 142 676 L138 238 L95 292 L18 250 Q60 108 120 82 Z";
const LONG = "M235 40 Q300 50 365 40 L478 82 Q532 100 548 250 L592 600 L536 612 L480 300 L462 676 Q300 688 138 676 L120 300 L64 612 L8 600 L52 250 Q68 100 122 82 Z";
const HOODIE = "M232 60 Q300 -36 368 60 L472 96 Q540 122 560 300 L588 586 L528 598 L480 330 L480 652 L472 694 L128 694 L120 652 L120 330 L72 598 L12 586 L40 300 Q60 122 128 96 Z";
const JACKET = "M228 44 L300 58 L372 44 L478 84 Q532 100 550 250 L592 600 L536 612 L482 300 L470 680 L130 680 L118 300 L64 612 L8 600 L50 250 Q68 100 122 84 Z";
const CREW = "M235 42 Q300 52 365 42 L478 84 Q532 102 548 252 L590 590 L534 602 L480 300 L470 640 L476 690 L124 690 L130 640 L120 300 L66 602 L10 590 L52 252 Q68 102 122 84 Z";

const stitch = (d, color) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="0.5" stroke-width="1.4" stroke-dasharray="5 4"/>`;

function teeParts(base, side) {
  const dark = shade(base, -0.35);
  const rib = shade(base, -0.12);
  const neck =
    side === "front"
      ? `<path d="M242 42 Q300 112 358 42 Q300 52 242 42 Z" fill="${dark}"/>
         <path d="M238 41 Q300 120 362 41" fill="none" stroke="${rib}" stroke-width="12"/>
         ${stitch("M246 46 Q300 128 354 46", dark)}`
      : `<path d="M236 41 Q300 58 364 41" fill="none" stroke="${rib}" stroke-width="11"/>
         ${stitch("M240 52 Q300 68 360 52", dark)}`;
  return `${neck}
    ${stitch("M26 238 L101 279", dark)}
    ${stitch("M574 238 L499 279", dark)}
    ${stitch("M144 658 Q300 670 456 658", dark)}`;
}

function longParts(base, side, rawHem = false) {
  const dark = shade(base, -0.35);
  const rib = shade(base, -0.12);
  const neck =
    side === "front"
      ? `<path d="M242 42 Q300 108 358 42 Q300 52 242 42 Z" fill="${dark}"/>
         <path d="M238 41 Q300 116 362 41" fill="none" stroke="${rib}" stroke-width="11"/>`
      : `<path d="M236 41 Q300 58 364 41" fill="none" stroke="${rib}" stroke-width="10"/>`;
  const hem = rawHem
    ? `<path d="M140 676 ${Array.from({ length: 40 }, (_, i) => `L${146 + i * 8} ${i % 2 ? 680 : 672}`).join(" ")}" fill="none" stroke="${dark}" stroke-opacity="0.45" stroke-width="1.2"/>`
    : stitch("M140 658 Q300 670 460 658", dark);
  return `${neck}
    ${stitch("M10 584 L66 596", dark)}
    ${stitch("M590 584 L534 596", dark)}
    ${hem}`;
}

function hoodieParts(base, side) {
  const dark = shade(base, -0.4);
  const mid = shade(base, -0.14);
  const cuffs = `
    <path d="M16 548 L76 560 L72 598 L12 586 Z" fill="${mid}"/>${ribbing(14, 76, 552, 596, dark, 6)}
    <path d="M584 548 L524 560 L528 598 L588 586 Z" fill="${mid}"/>${ribbing(524, 586, 552, 596, dark, 6)}
    <path d="M120 652 L480 652 L472 694 L128 694 Z" fill="${mid}"/>${ribbing(124, 476, 654, 692, dark)}`;
  if (side === "front") {
    return `
      <path d="M250 62 Q300 4 350 62 Q332 124 300 132 Q268 124 250 62 Z" fill="${dark}"/>
      <path d="M232 60 Q300 -36 368 60 Q340 150 300 158 Q260 150 232 60" fill="none" stroke="${mid}" stroke-width="10"/>
      <path d="M282 140 Q276 200 278 262" fill="none" stroke="${shade(base, 0.55)}" stroke-width="5" stroke-linecap="round"/>
      <path d="M318 140 Q324 200 322 262" fill="none" stroke="${shade(base, 0.55)}" stroke-width="5" stroke-linecap="round"/>
      <rect x="273" y="258" width="10" height="20" rx="3" fill="${shade(base, -0.6)}"/>
      <rect x="317" y="258" width="10" height="20" rx="3" fill="${shade(base, -0.6)}"/>
      <path d="M182 470 L418 470 Q430 540 446 612 L154 612 Q170 540 182 470 Z" fill="${shade(base, -0.06)}"/>
      ${stitch("M186 478 L414 478", dark)}
      <path d="M182 470 Q166 540 154 612" fill="none" stroke="${dark}" stroke-opacity="0.45" stroke-width="2"/>
      <path d="M418 470 Q434 540 446 612" fill="none" stroke="${dark}" stroke-opacity="0.45" stroke-width="2"/>
      ${cuffs}`;
  }
  return `
    <path d="M236 58 Q300 -36 364 58 L356 196 Q300 220 244 196 Z" fill="${shade(base, -0.08)}"/>
    <path d="M300 12 L300 210" stroke="${dark}" stroke-opacity="0.45" stroke-width="2"/>
    <path d="M244 196 Q300 220 356 196" fill="none" stroke="${dark}" stroke-opacity="0.3" stroke-width="3"/>
    ${cuffs}`;
}

function jacketParts(base, side) {
  const dark = shade(base, -0.45);
  const mid = shade(base, -0.12);
  const light = shade(base, 0.12);
  const cuffs = `
    <path d="M10 584 L66 596 L64 612 L8 600 Z" fill="${mid}"/>
    <path d="M590 584 L534 596 L536 612 L592 600 Z" fill="${mid}"/>
    <path d="M128 646 L472 646 L470 680 L130 680 Z" fill="${mid}"/>
    ${stitch("M130 650 L470 650", dark)}`;
  if (side === "front") {
    const snaps = [170, 260, 350, 440, 530, 618]
      .map((y) => `<circle cx="300" cy="${y}" r="7" fill="${shade(base, -0.65)}"/><circle cx="298" cy="${y - 2}" r="2.4" fill="${light}" opacity="0.7"/>`)
      .join("");
    return `
      <path d="M236 46 L300 60 L364 46 L300 120 Z" fill="${dark}"/>
      <path d="M300 60 L300 680" stroke="${dark}" stroke-opacity="0.55" stroke-width="2"/>
      <path d="M310 70 L310 680" stroke="${dark}" stroke-opacity="0.3" stroke-width="1.5"/>
      <path d="M228 42 L300 58 L292 74 L262 150 L214 72 Z" fill="${mid}"/>
      <path d="M372 42 L300 58 L308 74 L338 150 L386 72 Z" fill="${mid}"/>
      <path d="M228 42 L214 72 L262 150" fill="none" stroke="${dark}" stroke-opacity="0.4" stroke-width="2"/>
      <path d="M372 42 L386 72 L338 150" fill="none" stroke="${dark}" stroke-opacity="0.4" stroke-width="2"/>
      <path d="M148 470 L188 566" stroke="${dark}" stroke-opacity="0.6" stroke-width="5" stroke-linecap="round"/>
      <path d="M452 470 L412 566" stroke="${dark}" stroke-opacity="0.6" stroke-width="5" stroke-linecap="round"/>
      ${snaps}
      ${cuffs}
      <circle cx="170" cy="676" r="5" fill="${shade(base, -0.65)}"/><circle cx="430" cy="676" r="5" fill="${shade(base, -0.65)}"/>`;
  }
  return `
    <path d="M228 42 L300 56 L372 42 L372 72 L300 86 L228 72 Z" fill="${mid}"/>
    <path d="M118 182 Q300 198 482 182" fill="none" stroke="${dark}" stroke-opacity="0.45" stroke-width="2"/>
    ${stitch("M118 190 Q300 206 482 190", dark)}
    ${cuffs}`;
}

function crewParts(base, side) {
  const dark = shade(base, -0.38);
  const mid = shade(base, -0.1);
  const bands = `
    <path d="M16 552 L72 564 L66 602 L10 590 Z" fill="${mid}"/>${ribbing(12, 72, 556, 600, dark, 6)}
    <path d="M584 552 L528 564 L534 602 L590 590 Z" fill="${mid}"/>${ribbing(528, 588, 556, 600, dark, 6)}
    <path d="M130 640 L470 640 L476 690 L124 690 Z" fill="${mid}"/>${ribbing(126, 474, 642, 688, dark)}`;
  if (side === "front") {
    return `
      <path d="M242 44 Q300 104 358 44 Q300 54 242 44 Z" fill="${dark}"/>
      <path d="M236 43 Q300 118 364 43" fill="none" stroke="${mid}" stroke-width="18"/>
      ${ribbing(240, 360, 44, 52, dark, 6)}
      <path d="M286 110 L300 132 L314 110" fill="none" stroke="${mid}" stroke-width="6"/>
      ${bands}`;
  }
  return `
    <path d="M236 43 Q300 60 364 43" fill="none" stroke="${mid}" stroke-width="16"/>
    <rect x="284" y="62" width="32" height="16" fill="${shade(base, 0.5)}"/>
    ${bands}`;
}

/* -------------------------------------------------------------- products */

const BONE = "#ECE8E1";
const INK = "#171614";
const CLAY = "#8A6A52";

const products = [
  {
    id: "studio-heavy-tee",
    shape: TEE,
    base: "#1F1E1C",
    parts: teeParts,
    front: (b) => text(300, 176, "OFFCUT", { size: 22, fill: BONE, spacing: 6 }),
    back: (b) =>
      text(300, 250, "CUT FROM", { size: 56, fill: BONE, spacing: 1 }) +
      text(300, 312, "THE SAME", { size: 56, fill: BONE, spacing: 1 }) +
      text(300, 374, "CLOTH.", { size: 56, fill: CLAY, spacing: 1 }) +
      text(300, 420, "OFFCUT STUDIO — PARIS — 001", { size: 13, fill: BONE, spacing: 3, font: MONO, weight: 700, opacity: 0.8 }),
  },
  {
    id: "off-grid-hoodie",
    shape: HOODIE,
    base: "#8A6A52",
    parts: hoodieParts,
    front: (b) => text(300, 380, "OFFCUT", { size: 54, fill: "#F1EAE0", spacing: 3 }),
    back: (b) =>
      text(300, 340, "OFF", { size: 118, fill: "#F1EAE0", spacing: 2 }) +
      text(300, 452, "GRID", { size: 118, fill: "#F1EAE0", spacing: 2 }) +
      text(300, 500, "NO SIGNAL / NO NOISE / NO SEASON", { size: 13, fill: "#F1EAE0", spacing: 3, font: MONO, weight: 700, opacity: 0.85 }),
  },
  {
    id: "raw-edge-longsleeve",
    shape: LONG,
    base: "#D3C5AD",
    parts: (base, side) => longParts(base, side, true),
    front: (b) => text(392, 180, "RAW EDGE", { size: 15, fill: INK, spacing: 3, font: MONO, weight: 700 }),
    back: (b) => `
      <defs><path id="ring" d="M300 230 m-96 0 a96 96 0 1 1 192 0 a96 96 0 1 1 -192 0"/></defs>
      <circle cx="300" cy="230" r="118" fill="none" stroke="${INK}" stroke-width="3"/>
      <circle cx="300" cy="230" r="76" fill="none" stroke="${INK}" stroke-width="1.5"/>
      <text font-family="${MONO}" font-weight="700" font-size="17" letter-spacing="5" fill="${INK}"><textPath href="#ring">OFFCUT · PARIS · DROP 01 · NUMBERED RUN ·</textPath></text>
      ${text(300, 248, "003", { size: 48, fill: INK })}`,
  },
  {
    id: "night-shift-coach-jacket",
    shape: JACKET,
    base: "#3A3B2D",
    parts: jacketParts,
    front: (b) => text(400, 220, "OFFCUT", { size: 16, fill: BONE, spacing: 4 }),
    back: (b) =>
      text(300, 330, "NIGHT", { size: 104, fill: BONE, spacing: 2 }) +
      text(300, 432, "SHIFT", { size: 104, fill: BONE, spacing: 2 }) +
      text(300, 482, "OFFCUT ATELIER — AFTER HOURS", { size: 14, fill: BONE, spacing: 3, font: MONO, weight: 700, opacity: 0.85 }),
  },
  {
    id: "pattern-room-crewneck",
    shape: CREW,
    base: "#A39E94",
    parts: crewParts,
    front: (b) => text(300, 230, "OFFCUT", { size: 30, fill: shade(b, -0.22), spacing: 8 }),
    back: (b) => text(300, 200, "PATTERN ROOM", { size: 18, fill: shade(b, -0.25), spacing: 8, font: MONO, weight: 700 }),
  },
  {
    id: "selvedge-pocket-tee",
    shape: TEE,
    base: "#F7F5F0",
    outline: 0.45,
    parts: teeParts,
    front: (b) => `
      <rect x="352" y="168" width="78" height="88" fill="${shade(b, -0.04)}" stroke="${shade(b, -0.25)}" stroke-width="1.5"/>
      <rect x="352" y="168" width="78" height="6" fill="${CLAY}"/>
      <rect x="352" y="174" width="78" height="2" fill="${BONE}"/>
      ${stitch("M356 180 L356 252 L426 252 L426 180", shade(b, -0.4))}
      <rect x="160" y="640" width="34" height="14" fill="${INK}"/>`,
    back: (b) =>
      text(300, 110, "OFFCUT", { size: 16, fill: INK, spacing: 6 }) +
      text(300, 132, "SELVEDGE SERIES", { size: 10, fill: INK, spacing: 4, font: MONO, weight: 700, opacity: 0.7 }),
  },
];

for (const p of products) {
  for (const side of ["front", "back"]) {
    const layers = p.parts(p.base, side) + p[side](p.base);
    const file = join(outDir, `${p.id}-${side}.svg`);
    writeFileSync(file, svg({ silhouette: p.shape, base: p.base, layers, outline: p.outline }));
    console.log("wrote", file.replace(root, ""));
  }
}
