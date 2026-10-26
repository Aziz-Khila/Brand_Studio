import { isLightColor } from "./prompts";

export type PhotoBackground = "transparent" | "checkerboard" | "plain";

export type GarmentAnalysis = {
  background: PhotoBackground;
  /** Median color of the garment pixels. */
  hex: string;
  colorName: string;
  light: boolean;
};

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? 128;
};

/** Reads a downscaled copy of the photo and separates garment from background by the border colors. */
export async function analyzeGarment(file: Blob): Promise<GarmentAnalysis> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 240 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const { data } = context.getImageData(0, 0, width, height);
  const px = width * height;

  let transparent = 0;
  for (let i = 0; i < px; i++) if (data[i * 4 + 3] < 16) transparent++;
  const hasAlpha = transparent > px * 0.05;

  // Background tones: the most common colors along the border (a checkerboard has two).
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const addBorder = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const key = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++;
    bucket.r += data[i];
    bucket.g += data[i + 1];
    bucket.b += data[i + 2];
    buckets.set(key, bucket);
  };
  for (let x = 0; x < width; x++) {
    addBorder(x, 1);
    addBorder(x, height - 2);
  }
  for (let y = 0; y < height; y++) {
    addBorder(1, y);
    addBorder(width - 2, y);
  }
  const borderTotal = 2 * (width + height);
  const tones = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .filter((bucket, index) => index === 0 || bucket.count > borderTotal * 0.08)
    .map(({ count, r, g, b }) => [r / count, g / count, b / count]);
  const distinctTones =
    tones.length >= 2 &&
    Math.abs(tones[0][0] + tones[0][1] + tones[0][2] - (tones[1][0] + tones[1][1] + tones[1][2])) / 3 > 6;

  const isBackground = (i: number) => {
    if (hasAlpha) return data[i * 4 + 3] < 128;
    return tones.some(
      ([r, g, b]) => Math.abs(data[i * 4] - r) + Math.abs(data[i * 4 + 1] - g) + Math.abs(data[i * 4 + 2] - b) < 36,
    );
  };

  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  for (let i = 0; i < px; i++) {
    if (isBackground(i)) continue;
    rs.push(data[i * 4]);
    gs.push(data[i * 4 + 1]);
    bs.push(data[i * 4 + 2]);
  }
  const hex = rs.length > px * 0.01 ? toHex(median(rs), median(gs), median(bs)) : "#808080";

  return {
    background: hasAlpha ? "transparent" : distinctTones ? "checkerboard" : "plain",
    hex,
    colorName: describeColor(hex),
    light: isLightColor(hex),
  };
}

/** A rough, editable name for a color: "black", "dark green", "beige"… */
export function describeColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }

  if (s < 0.12 || d < 0.06) {
    if (l > 0.9) return "white";
    if (l > 0.72) return "light grey";
    if (l > 0.42) return "grey";
    if (l > 0.2) return "charcoal";
    return "black";
  }
  if (h >= 15 && h < 50 && l > 0.7 && s < 0.6) return l > 0.85 ? "cream" : "beige";
  if (h >= 15 && h < 45 && l < 0.4) return l < 0.2 ? "dark brown" : "brown";
  if (h >= 50 && h < 95 && l < 0.4) return "olive";
  if ((h < 15 || h >= 340) && l < 0.3) return "burgundy";
  if (h >= 200 && h < 250 && l < 0.25) return "navy";

  const hue =
    h < 15 || h >= 340
      ? l > 0.7
        ? "pink"
        : "red"
      : h < 45
        ? "orange"
        : h < 65
          ? "yellow"
          : h < 160
            ? "green"
            : h < 195
              ? "teal"
              : h < 250
                ? "blue"
                : h < 290
                  ? "purple"
                  : "pink";
  if (l < 0.25) return `dark ${hue}`;
  if (l > 0.75) return `light ${hue}`;
  return hue;
}
