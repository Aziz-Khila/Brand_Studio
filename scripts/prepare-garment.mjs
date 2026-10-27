// Turns a front/back pair of product photos into showcase-ready transparent PNGs.
//
//   node scripts/prepare-garment.mjs <front> <back> <outDir> <productId>
//
// Works on any front/back pair without options:
// - Images with real transparency keep it.
// - A baked-in "fake transparency" checkerboard is detected from its tile grid and removed.
// - Any other plain background (white, grey, beige…) is measured on the border and removed.
// - Opaque photos are cross-checked with a local AI segmentation model; if the color-based cut
//   removed part of the garment or left background behind, the AI silhouette is used instead.
// - Front and back get the exact same scale and offset so they line up when flipped.
// - Framing: 1280x1520 canvas, garment centred, top at 6.5% (3% for hooded pieces, detected
//   automatically), max 88% wide, bottom no lower than 92.5%.
//
// Optional flags: --ai (always use the AI model), --no-ai (skip the AI check), --hood (force hood framing),
// --footwear (one shoe in side profile: framed standing on a ground line instead of from the top).
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

const [front, back, outDir, id, ...flags] = process.argv.slice(2);
if (!front || !back || !outDir || !id) {
  console.error("Usage: node scripts/prepare-garment.mjs <front> <back> <outDir> <productId> [--ai | --no-ai] [--hood] [--footwear]");
  process.exit(1);
}

const CANVAS_W = 1280;
const CANVAS_H = 1520;
const BOTTOM = 0.925;
const MAX_WIDTH = 0.88;

/** Keeps the garment and any sizeable detached parts; drops leftover background specks. */
function removeSpecks(alpha, width, height) {
  const px = width * height;
  const labels = new Int32Array(px).fill(-1);
  const sizes = [];
  const queue = new Int32Array(px);
  for (let start = 0; start < px; start++) {
    if (alpha[start] === 0 || labels[start] !== -1) continue;
    const label = sizes.length;
    let head = 0;
    let tail = 0;
    labels[start] = label;
    queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++];
      const x = i % width;
      const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width];
      for (const n of neighbours) {
        if (n >= 0 && n < px && alpha[n] !== 0 && labels[n] === -1) {
          labels[n] = label;
          queue[tail++] = n;
        }
      }
    }
    sizes.push(tail);
  }
  const largest = Math.max(0, ...sizes);
  for (let i = 0; i < px; i++) {
    if (labels[i] >= 0 && sizes[labels[i]] < largest * 0.01) alpha[i] = 0;
  }
}

/** Marks pixels reachable from the image border through pixels accepted by `isBackground`. */
function floodFromBorder(width, height, isBackground) {
  const px = width * height;
  const background = new Uint8Array(px);
  const queue = new Int32Array(px);
  let head = 0;
  let tail = 0;
  const push = (i) => {
    if (!background[i] && isBackground(i)) {
      background[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < px - width) push(i + width);
  }
  return background;
}

const luminance = (data, i) => (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;

/** Fits evenly spaced light/dark transitions along a line of pixels; returns the tile grid or null. */
function fitGrid(values) {
  const light = values.filter((v) => v >= 200);
  if (light.length < values.length * 0.9) return null;
  const mid = (Math.min(...light) + Math.max(...light)) / 2;
  const crossings = [];
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];
    if (a < mid !== b < mid) crossings.push(i - 1 + (mid - a) / (b - a));
  }
  const n = crossings.length;
  if (n < 8) return null;
  const meanK = (n - 1) / 2;
  const meanC = crossings.reduce((sum, c) => sum + c, 0) / n;
  let num = 0;
  let den = 0;
  crossings.forEach((c, k) => {
    num += (k - meanK) * (c - meanC);
    den += (k - meanK) ** 2;
  });
  const size = num / den;
  const start = meanC - size * meanK;
  const worst = Math.max(...crossings.map((c, k) => Math.abs(c - (start + size * k))));
  if (size < 6 || size > 120 || worst > 1.5) return null;
  return { start, size };
}

/**
 * Detects a baked-in "fake transparency" checkerboard and classifies every pixel against the
 * tile color expected at its position. This separates white garments from white tiles, which a
 * plain color threshold cannot do. Returns a background mask, or null if there is no checkerboard.
 */
function checkerBackground(data, width, height) {
  const row = Array.from({ length: width }, (_, x) => luminance(data, 2 * width + x));
  const column = Array.from({ length: height }, (_, y) => luminance(data, y * width + 2));
  const gx = fitGrid(row);
  const gy = fitGrid(column);
  if (!gx || !gy) return null;

  const cell = (value, grid) => {
    const f = (value - grid.start) / grid.size;
    const index = Math.floor(f);
    const edge = Math.min(f - index, index + 1 - f) * grid.size;
    return { index, edge };
  };

  // Tile colors and how neutral the checkerboard is, from the border rows away from tile edges.
  // Garments usually carry a faint tint the checkerboard doesn't have, so the allowed tint is
  // taken from the background itself.
  const samples = [[], []];
  const spreads = [];
  for (const y of [2, 3, height - 3, height - 4]) {
    const cy = cell(y, gy);
    for (let x = 0; x < width; x++) {
      const cx = cell(x, gx);
      if (cx.edge < 3 || cy.edge < 3) continue;
      const i = y * width + x;
      samples[(cx.index + cy.index) & 1].push(luminance(data, i));
      spreads.push(Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) - Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]));
    }
  }
  const median = (list) => list.sort((a, b) => a - b)[list.length >> 1];
  if (!samples[0].length || !samples[1].length) return null;
  spreads.sort((a, b) => a - b);
  const neutralTolerance = Math.max(1, spreads[Math.floor(spreads.length * 0.99)]);
  const tone = [median(samples[0]), median(samples[1])];
  if (Math.abs(tone[0] - tone[1]) < 8) return null;
  const low = Math.min(...tone);
  const high = Math.max(...tone);

  // Per pixel: does it look like the checkerboard at this position? Per tile: how much of its
  // interior does? Tile indices are offset by one so partial tiles at the image edge fit.
  const tilesX = Math.ceil(width / gx.size) + 2;
  const tilesY = Math.ceil(height / gy.size) + 2;
  const tileOf = new Int32Array(width * height);
  const interior = new Uint32Array(tilesX * tilesY);
  const matching = new Uint32Array(tilesX * tilesY);
  const candidate = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const cy = cell(y, gy);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cx = cell(x, gx);
      const tile = (cy.index + 1) * tilesX + (cx.index + 1);
      tileOf[i] = tile;
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const neutral = Math.max(r, g, b) - Math.min(r, g, b) <= neutralTolerance;
      const lum = (r + g + b) / 3;
      if (cx.edge > 1.6 && cy.edge > 1.6) {
        const match = neutral && Math.abs(lum - tone[(cx.index + cy.index) & 1]) <= 4;
        interior[tile]++;
        if (match) matching[tile]++;
        candidate[i] = match ? 1 : 0;
      } else {
        candidate[i] = neutral && lum >= low - 5 && lum <= high + 3 ? 1 : 0;
      }
    }
  }

  // Walk background tiles inward from the image border. Tiles that match inside the garment are
  // never reached because the garment tiles around them don't match.
  const BACKGROUND = 1;
  const MIXED = 2;
  const state = new Uint8Array(tilesX * tilesY);
  for (let t = 0; t < state.length; t++) {
    if (!interior[t]) continue;
    const share = matching[t] / interior[t];
    state[t] = share >= 0.85 ? BACKGROUND : share > 0.1 ? MIXED : 0;
  }
  const reached = new Uint8Array(tilesX * tilesY);
  const queue = [];
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const edgeTile = tx <= 1 || ty <= 1 || tx >= tilesX - 2 || ty >= tilesY - 2;
      const t = ty * tilesX + tx;
      if (edgeTile && state[t] === BACKGROUND) {
        reached[t] = BACKGROUND;
        queue.push(t);
      }
    }
  }
  while (queue.length) {
    const t = queue.pop();
    const tx = t % tilesX;
    const ty = Math.floor(t / tilesX);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx;
        const ny = ty + dy;
        if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= tilesX || ny >= tilesY) continue;
        const n = ny * tilesX + nx;
        if (reached[n] === BACKGROUND) continue;
        const side = dx === 0 || dy === 0;
        if (state[n] === BACKGROUND && side) {
          reached[n] = BACKGROUND;
          queue.push(n);
        } else if (state[n] === MIXED && side && reached[n] !== MIXED) {
          // Partly-background tiles along the outline also lead on, so pockets of background
          // between the hood and the shoulders or under the arms are reached too.
          reached[n] = MIXED;
          queue.push(n);
        } else if (!reached[n]) {
          // Every tile touching the background is decided pixel by pixel.
          reached[n] = MIXED;
        }
      }
    }
  }

  // Pixels of reached background tiles are background; in boundary (mixed) tiles only the
  // pixels that look like the checkerboard and connect to the background are.
  const passable = (i) => {
    const r = reached[tileOf[i]];
    return r === BACKGROUND || (r === MIXED && candidate[i] === 1);
  };
  const background = floodFromBorder(width, height, passable);
  const garment = new Uint8Array(width * height);
  for (let i = 0; i < garment.length; i++) garment[i] = background[i] ? 0 : 1;
  const closed = morph(morph(garment, width, height, 2, true), width, height, 2, false);
  // JPEG stores the tint in 8px blocks, so the outline steps; blur-and-threshold rounds it off.
  const smooth = smoothMask(closed, width, height, 3);
  for (let i = 0; i < garment.length; i++) background[i] = smooth[i] ? 0 : 1;

  // JPEG blends tile and garment along the outline (and bleeds the garment's color into it), so a
  // light fringe can survive the exact tile match. Peel light outline pixels, a few pixels deep.
  const looksLikeTile = (i) => {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = (r + g + b) / 3;
    return Math.max(r, g, b) - Math.min(r, g, b) <= 28 && lum >= low - 15 && lum <= high + 3;
  };
  peelOutline(background, width, looksLikeTile, 4);
  return { background, looksLikeTile, low };
}

/** Moves garment pixels on the outline that pass the test to the background, layer by layer. */
function peelOutline(background, width, test, passes) {
  for (let pass = 0; pass < passes; pass++) {
    const peel = [];
    for (let i = 0; i < background.length; i++) {
      if (background[i] || !test(i)) continue;
      const x = i % width;
      if (
        (x > 0 && background[i - 1]) ||
        (x < width - 1 && background[i + 1]) ||
        (i >= width && background[i - width]) ||
        (i < background.length - width && background[i + width])
      ) {
        peel.push(i);
      }
    }
    if (!peel.length) return;
    for (const i of peel) background[i] = 1;
  }
}

/**
 * JPEG ringing next to a dark or saturated outline leaves a light halo up to ~8px wide, brighter
 * than the tiles themselves, and narrow gaps (between a cuff and the hem) are too small for the
 * tile walk. Peeling further is only safe where something else confirms it's background: the AI
 * mask (as far as it agrees), or without it a garment clearly darker than the checkerboard.
 */
function peelHalo(checker, background, data, width, alpha) {
  if (alpha) {
    peelOutline(background, width, (i) => alpha[i] < 128 && checker.looksLikeTile(i), Infinity);
    return;
  }
  const lums = [];
  for (let i = 0; i < background.length; i += 7) if (!background[i]) lums.push(luminance(data, i));
  lums.sort((a, b) => a - b);
  if (lums.length && lums[lums.length >> 1] < checker.low - 40) peelOutline(background, width, checker.looksLikeTile, 10);
}

/** Rounds off small steps in a binary mask: two box blurs of the given radius, then a 50% threshold. */
function smoothMask(mask, width, height, radius) {
  let values = Float32Array.from(mask);
  const blur = (source, horizontal) => {
    const out = new Float32Array(source.length);
    const span = radius * 2 + 1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const xx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
          const yy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
          sum += source[yy * width + xx];
        }
        out[y * width + x] = sum / span;
      }
    }
    return out;
  };
  for (let pass = 0; pass < 2; pass++) values = blur(blur(values, true), false);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = values[i] >= 0.5 ? 1 : 0;
  return out;
}

/**
 * Transparent pixels still hold the old background's colors, which softening and resizing would
 * blend back into the outline as a light halo. Copy the garment's edge colors outward instead.
 */
function bleedColors(data, alpha, width, height, passes) {
  const filled = Uint8Array.from(alpha, (a) => (a > 0 ? 1 : 0));
  for (let pass = 0; pass < passes; pass++) {
    const updates = [];
    for (let i = 0; i < filled.length; i++) {
      if (filled[i]) continue;
      const x = i % width;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
        if (j < 0 || j >= filled.length || !filled[j]) continue;
        r += data[j * 4];
        g += data[j * 4 + 1];
        b += data[j * 4 + 2];
        n++;
      }
      if (n) updates.push(i, r / n, g / n, b / n);
    }
    for (let k = 0; k < updates.length; k += 4) {
      const i = updates[k];
      data[i * 4] = updates[k + 1];
      data[i * 4 + 1] = updates[k + 2];
      data[i * 4 + 2] = updates[k + 3];
      filled[i] = 1;
    }
  }
}

/** Square dilation (dilate = true) or erosion of a binary mask. */
function morph(mask, width, height, radius, dilate) {
  const pass = (source, horizontal) => {
    const out = new Uint8Array(source.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = dilate ? 0 : 1;
        for (let k = -radius; k <= radius; k++) {
          const xx = horizontal ? Math.min(width - 1, Math.max(0, x + k)) : x;
          const yy = horizontal ? y : Math.min(height - 1, Math.max(0, y + k));
          const v = source[yy * width + xx];
          value = dilate ? value | v : value & v;
        }
        out[y * width + x] = value;
      }
    }
    return out;
  };
  return pass(pass(mask, true), false);
}

/**
 * Removes a plain background of any color (white, grey, beige…): its color is measured on the
 * image border and everything close to it that connects to the border is background.
 */
function plainBackground(data, width, height) {
  const border = [];
  for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x, width + x, (height - 2) * width + x);
  for (let y = 0; y < height; y++) border.push(y * width, y * width + width - 1, y * width + 1, y * width + width - 2);
  const median = (channel) => {
    const values = border.map((i) => data[i * 4 + channel]).sort((a, b) => a - b);
    return values[values.length >> 1];
  };
  const color = [median(0), median(1), median(2)];
  const distance = (i) =>
    Math.max(Math.abs(data[i * 4] - color[0]), Math.abs(data[i * 4 + 1] - color[1]), Math.abs(data[i * 4 + 2] - color[2]));
  const spread = border.map(distance).sort((a, b) => a - b)[Math.floor(border.length * 0.95)];
  const tolerance = Math.min(48, Math.max(12, spread * 2 + 6));
  return floodFromBorder(width, height, (i) => distance(i) <= tolerance);
}

/** Runs the local AI segmentation (in its own process, see ai-cutout.mjs) and returns its alpha channel. */
async function aiAlpha(file, width, height) {
  const output = join(tmpdir(), `garment-${process.pid}-${Date.now()}.png`);
  try {
    execFileSync(process.execPath, [join(scriptDir, "ai-cutout.mjs"), file, output], { stdio: "ignore" });
    const { data, info } = await sharp(await readFile(output)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== width || info.height !== height) return null;
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
    return alpha;
  } catch {
    return null;
  } finally {
    await rm(output, { force: true });
  }
}

const countZeros = (mask) => mask.reduce((sum, v) => sum + (v ? 0 : 1), 0);

/**
 * Finds the background of an opaque photo. The color-based methods give the crispest edges; the AI
 * silhouette is used to check them and replaces them when they removed part of the garment or left
 * background behind (typically a white garment on a white background).
 */
async function findBackground(file, data, width, height) {
  const px = width * height;
  const forceAi = flags.includes("--ai");
  const skipAi = flags.includes("--no-ai");

  let method = "checkerboard background";
  const checker = forceAi ? null : checkerBackground(data, width, height);
  let background = checker?.background ?? null;
  if (!forceAi && !background) {
    method = "plain background";
    background = plainBackground(data, width, height);
  }
  if (skipAi) {
    if (checker) peelHalo(checker, background, data, width, null);
    return { background, method };
  }

  const alpha = await aiAlpha(file, width, height);
  if (!alpha) {
    if (!background) throw new Error(`AI segmentation failed for ${file}`);
    console.warn(`  AI check unavailable for ${file}, using the ${method} result as is.`);
    if (checker) peelHalo(checker, background, data, width, null);
    return { background, method };
  }
  // Solid silhouette: everything the model doesn't clearly reject and that isn't reachable from
  // the border is garment, so plain light areas inside never turn see-through.
  const aiBackground = floodFromBorder(width, height, (i) => alpha[i] < 24);
  if (forceAi || !background) return { background: aiBackground, method: "AI segmentation" };

  const garment = countZeros(background);
  const aiLoose = countZeros(aiBackground);
  const aiCore = alpha.reduce((sum, v) => sum + (v >= 128 ? 1 : 0), 0);
  const ateGarment = garment < aiCore * 0.85;
  const leftBackground = garment > aiLoose * 1.25 || garment > px * 0.97;
  if (ateGarment || leftBackground) {
    const reason = ateGarment ? "it removed part of the garment" : "it left background behind";
    console.warn(`  ${method} rejected for ${file} (${reason}), using AI segmentation instead.`);
    return { background: aiBackground, method: "AI segmentation" };
  }
  if (checker) peelHalo(checker, background, data, width, alpha);
  return { background, method };
}

async function cutOut(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = width * height;
  const alpha = new Uint8Array(px);
  let transparent = 0;
  for (let i = 0; i < px; i++) {
    alpha[i] = data[i * 4 + 3];
    if (alpha[i] < 16) transparent++;
  }

  if (transparent > px * 0.05 && !flags.includes("--ai")) {
    console.log(`${file}: transparent image, keeping its alpha`);
    for (let i = 0; i < px; i++) if (alpha[i] < 20) alpha[i] = 0;
  } else {
    const { background, method } = await findBackground(file, data, width, height);
    console.log(`${file}: ${method}`);
    // Shrink the garment by a pixel so edge pixels blended with the old background don't leave a halo.
    const garment = new Uint8Array(px);
    for (let i = 0; i < px; i++) garment[i] = background[i] ? 0 : 1;
    const inner = morph(garment, width, height, 1, false);
    for (let i = 0; i < px; i++) {
      if (!inner[i]) {
        alpha[i] = 0;
        continue;
      }
      const x = i % width;
      const touchesOutside =
        (x > 0 && !inner[i - 1]) ||
        (x < width - 1 && !inner[i + 1]) ||
        (i >= width && !inner[i - width]) ||
        (i < px - width && !inner[i + width]);
      alpha[i] = touchesOutside ? 110 : 255;
    }
  }

  removeSpecks(alpha, width, height);
  bleedColors(data, alpha, width, height, 4);

  const softAlpha = await sharp(Buffer.from(alpha), { raw: { width, height, channels: 1 } })
    .blur(0.6)
    .extractChannel(0)
    .raw()
    .toBuffer();
  for (let i = 0; i < px; i++) data[i * 4 + 3] = softAlpha[i];

  // Bounding box of the garment, ignoring stray specks.
  const minCount = 3;
  let top = height;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 128) count++;
    if (count >= minCount) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y < height; y++) if (data[(y * width + x) * 4 + 3] > 128) count++;
    if (count >= minCount) {
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  if (right < 0) throw new Error(`No garment found in ${file}`);

  return { data, width, height, box: { left, top, right, bottom } };
}

/**
 * A hood makes the top of the garment much narrower than its body; hooded pieces get a smaller
 * top margin so they sit at the same height as the rest of the collection.
 */
function looksHooded({ data, width, box }) {
  const rowWidth = (y) => {
    let first = -1;
    let last = -1;
    for (let x = box.left; x <= box.right; x++) {
      if (data[(y * width + x) * 4 + 3] > 128) {
        if (first < 0) first = x;
        last = x;
      }
    }
    return first < 0 ? 0 : last - first + 1;
  };
  const boxWidth = box.right - box.left + 1;
  const sampleY = box.top + Math.round((box.bottom - box.top) * 0.06);
  return rowWidth(sampleY) < boxWidth * 0.42;
}

const images = [await cutOut(front), await cutOut(back)];

if (images[0].width !== images[1].width || images[0].height !== images[1].height) {
  console.warn("Front and back photos have different sizes; alignment may be off.");
}

for (const [index, img] of images.entries()) {
  const { box: b, width, height } = img;
  if (b.left <= 1 || b.top <= 1 || b.right >= width - 2 || b.bottom >= height - 2) {
    console.warn(`The ${index ? "back" : "front"} garment touches the photo edge; it may be cropped in the original.`);
  }
}

// Footwear is wide and low: same width cap, but it stands on a ground line just above the
// carousel's floor shadow instead of hanging from the top like a garment.
const footwear = flags.includes("--footwear");
const FOOTWEAR_GROUND = 0.86;
const FOOTWEAR_MAX_HEIGHT = 0.6;

const TOP = footwear ? 0 : flags.includes("--hood") || looksHooded(images[0]) ? 0.03 : 0.065;

const box = {
  left: Math.min(...images.map((img) => img.box.left)),
  top: Math.min(...images.map((img) => img.box.top)),
  right: Math.max(...images.map((img) => img.box.right)),
  bottom: Math.max(...images.map((img) => img.box.bottom)),
};
const boxW = box.right - box.left + 1;
const boxH = box.bottom - box.top + 1;
const scale = footwear
  ? Math.min((MAX_WIDTH * CANVAS_W) / boxW, (FOOTWEAR_MAX_HEIGHT * CANVAS_H) / boxH)
  : Math.min((MAX_WIDTH * CANVAS_W) / boxW, ((BOTTOM - TOP) * CANVAS_H) / boxH);
const targetW = Math.round(boxW * scale);
const targetH = Math.round(boxH * scale);
const offsetX = Math.round((CANVAS_W - targetW) / 2);
const offsetY = footwear ? Math.round(FOOTWEAR_GROUND * CANVAS_H - targetH) : Math.round(TOP * CANVAS_H);

mkdirSync(outDir, { recursive: true });

for (const [index, side] of ["front", "back"].entries()) {
  const img = images[index];
  const garment = await sharp(img.data, { raw: { width: img.width, height: img.height, channels: 4 } })
    .extract({ left: box.left, top: box.top, width: boxW, height: boxH })
    .resize(targetW, targetH, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  const file = join(outDir, `${id}-${side}.png`);
  await sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: garment, left: offsetX, top: offsetY }])
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log("wrote", file);
}
