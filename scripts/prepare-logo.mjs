// Turns a raster logo (dark mark on a light, plain background) into a tight, single-color SVG.
//
//   node scripts/prepare-logo.mjs <image> <out.svg> [--first-glyph] [--square] [--fill <color>]
//
// - The mark is traced to smooth vector paths, cropped to its bounds, sized by viewBox only.
// - Fill defaults to currentColor so the site can recolor it (dark on light, light on dark).
// - --first-glyph keeps only the first letter (e.g. to make an icon from a wordmark).
import sharp from "sharp";
import potrace from "potrace";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node scripts/prepare-logo.mjs <image> <out.svg> [--first-glyph] [--fill <color>]");
  process.exit(1);
}
const fillIndex = flags.indexOf("--fill");
const fill = fillIndex >= 0 ? flags[fillIndex + 1] : "currentColor";
const SCALE = 3;

// Upscale first so the traced curves come out smooth, then split ink from paper halfway between them.
const { data, info } = await sharp(input)
  .flatten({ background: "#ffffff" })
  .greyscale()
  .resize({ width: (await sharp(input).metadata()).width * SCALE, kernel: "lanczos3" })
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width, height } = info;
const sorted = Uint8Array.from(data).sort();
const paper = sorted[Math.floor(sorted.length * 0.9)];
const ink = sorted[Math.floor(sorted.length * 0.005)];
const threshold = (paper + ink) / 2;
const isInk = (x, y) => data[y * width + x] < threshold;

// Bounds of the mark, optionally only up to the first empty column after the first glyph.
let left = width;
let right = -1;
let top = height;
let bottom = -1;
// A few ink pixels in a column are JPEG specks, not part of the mark.
const columnHasInk = (x) => {
  let count = 0;
  for (let y = 0; y < height; y++) if (isInk(x, y) && ++count >= 2 * SCALE) return true;
  return false;
};
let firstInk = 0;
while (firstInk < width && !columnHasInk(firstInk)) firstInk++;
let lastColumn = width - 1;
if (flags.includes("--first-glyph")) {
  lastColumn = firstInk;
  while (lastColumn + 1 < width && columnHasInk(lastColumn + 1)) lastColumn++;
}
for (let y = 0; y < height; y++) {
  for (let x = firstInk; x <= lastColumn; x++) {
    if (!isInk(x, y)) continue;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
}
if (right < 0) throw new Error("No mark found: expected a dark logo on a light background.");

const cropWidth = right - left + 1;
const cropHeight = bottom - top + 1;
const binary = Buffer.alloc(cropWidth * cropHeight);
for (let y = 0; y < cropHeight; y++) {
  for (let x = 0; x < cropWidth; x++) binary[y * cropWidth + x] = isInk(left + x, top + y) ? 0 : 255;
}
const png = await sharp(binary, { raw: { width: cropWidth, height: cropHeight, channels: 1 } })
  .extend({ top: 4, bottom: 4, left: 4, right: 4, background: "#ffffff" })
  .png()
  .toBuffer();

const svg = await promisify(potrace.trace)(png, {
  threshold: 128,
  turdSize: 40 * SCALE,
  optTolerance: 0.4,
  color: fill,
  background: "transparent",
});

// Keep only the viewBox so the SVG scales to whatever box the site gives it.
// --square centers the mark on a square canvas with some breathing room (favicons, avatars).
const tidy = svg
  .replace(/<svg[^>]*?width="(\d+(?:\.\d+)?)"[^>]*?height="(\d+(?:\.\d+)?)"[^>]*>/, (_, w, h) => {
    if (!flags.includes("--square")) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`;
    const size = Math.round(Math.max(w, h) * 1.12);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${Math.round((w - size) / 2)} ${Math.round((h - size) / 2)} ${size} ${size}">`;
  })
  .replace(/\s*<rect[^>]*\/>/g, "");
await writeFile(output, `${tidy.trim()}\n`);
console.log(`wrote ${output} (${cropWidth / SCALE | 0}×${cropHeight / SCALE | 0} px mark, fill ${fill})`);
